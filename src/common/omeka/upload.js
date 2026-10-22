import {
  buildValues,
  hash,
  itemPayload,
  listPath,
  notesHtml,
  titleOf
} from './payload.js'

const NOOP = () => {}

/**
 * Uploads Tropy items to Omeka S, remembering the Omeka ids it gets back so
 * later runs update existing resources instead of creating duplicates.
 *
 * `links` is a store with async get(type, localId) => { omekaId, fingerprint },
 * set(type, localId, omekaId, fingerprint) and remove(type, localId).
 * Types: 'item', 'media', 'item_set' and 'notes' (keyed by item id).
 *
 * Local deletions are never propagated and local data wins on conflicts.
 */
export class Uploader {
  constructor({
    api,
    links,
    locateFile,
    template,
    convertRules,
    logger,
    onProgress = NOOP
  }) {
    this.api = api
    this.links = links
    this.locateFile = locateFile
    this.template = template
    this.convertRules = convertRules
    this.logger = logger
    this.onProgress = onProgress
    this.missing = new Set()
  }

  // Create or update a resource according to its stored link and fingerprint.
  // `update` may return a (numeric) new Omeka id if it had to replace the
  // resource; any other return value is ignored.
  async sync(type, localId, fingerprint, { create, update }) {
    let link = await this.links.get(type, localId)

    if (link) {
      if (link.fingerprint === fingerprint)
        return { status: 'unchanged', omekaId: link.omekaId }

      try {
        let replaced = await update(link.omekaId)
        let omekaId = Number.isInteger(replaced) ? replaced : link.omekaId
        await this.links.set(type, localId, omekaId, fingerprint)
        return { status: 'updated', omekaId }
      } catch (e) {
        if (!e.isNotFound) throw e
        this.logger?.warn(`${type} #${link.omekaId} is gone from Omeka, recreating`)
        await this.links.remove(type, localId)
      }
    }

    let omekaId = (await create())['o:id']
    await this.links.set(type, localId, omekaId, fingerprint)
    return { status: 'created', omekaId }
  }

  async syncItemSets(ids, lists) {
    let result = []

    for (let id of ids) {
      let name = listPath(lists, id)
      if (!name) continue

      if (!this.itemSets.has(id)) {
        await this.verifyLink('item_set', id, '/item_sets/')

        let title = this.titleValues(name)
        let { omekaId } = await this.sync('item_set', id, name, {
          create: () => this.api.createItemSet(title),
          update: (setId) => this.api.updateItemSet(setId, title)
        })
        this.itemSets.set(id, omekaId)
      }

      result.push(this.itemSets.get(id))
    }

    return result
  }

  // Forget a link whose resource was deleted from Omeka, so it is recreated.
  async verifyLink(type, localId, path) {
    let link = await this.links.get(type, localId)
    if (!link) return

    try {
      await this.api.get(`${path}${link.omekaId}`)
    } catch (e) {
      if (!e.isNotFound) throw e
      await this.links.remove(type, localId)
    }
  }

  // An item and all its media can be checked with a single request.
  async verifyItem(item) {
    let link = await this.links.get('item', item.id)
    if (!link) return

    let remote

    try {
      remote = await this.api.get(`/items/${link.omekaId}`)
    } catch (e) {
      if (!e.isNotFound) throw e
      await this.links.remove('item', item.id)
      await this.clearChildLinks(item)
      return
    }

    let present = new Set((remote['o:media'] || []).map(m => m['o:id']))
    let check = async (type, id) => {
      let media = await this.links.get(type, id)
      if (media && !present.has(media.omekaId))
        await this.links.remove(type, id)
    }

    await check('notes', item.id)
    for (let photo of item.photos)
      await check('media', photo.id)
  }

  titleValues(title) {
    return buildValues({
      'http://purl.org/dc/terms/title': { text: title }
    }, this.api.properties).values
  }

  async clearChildLinks(item) {
    await this.links.remove('notes', item.id)
    for (let photo of item.photos)
      await this.links.remove('media', photo.id)
  }

  async syncMedia(photo, itemOmekaId, result) {
    let { values, missing } =
      buildValues(photo.metadata, this.api.properties, this.convertRules)

    missing.forEach(m => this.missing.add(m))

    let fileHash = photo.checksum
    let fingerprint = `${fileHash}:${hash(values)}`

    let upload = async () => {
      let file = {
        path: await this.locateFile(photo),
        filename: photo.filename,
        mimetype: photo.mimetype
      }

      return this.api.createFileMedia(itemOmekaId, file, values)
    }

    let link = await this.links.get('media', photo.id)

    return this.sync('media', photo.id, fingerprint, {
      create: upload,
      update: async (omekaId) => {
        if (link.fingerprint.split(':')[0] === fileHash) {
          // Nothing but the metadata changed
          await this.api.updateMedia(omekaId, values)
          return omekaId
        }

        // Omeka can't swap the file of an existing media: replace it.
        try {
          await this.api.deleteMedia(omekaId)
        } catch (e) {
          if (!e.isNotFound) throw e
        }

        return (await upload())['o:id']
      }
    }).then(({ omekaId, status }) => {
      result.medias.push({ id: photo.id, omekaId, status })
    }).catch(e => {
      this.logger?.error({ stack: e.stack }, `failed to upload media ${photo.id}`)
      result.errors.push(`Photo ${photo.id}: ${e.message}`)
    })
  }

  async syncNotes(item, itemOmekaId, result) {
    let html = notesHtml(item)
    let link = await this.links.get('notes', item.id)

    if (!html) {
      if (link) {
        try {
          await this.api.deleteMedia(link.omekaId)
        } catch (e) {
          if (!e.isNotFound) throw e
        }
        await this.links.remove('notes', item.id)
      }
      return
    }

    let title = this.titleValues('Notes')

    // Omeka ignores edits to the content of an html media: replace it.
    let replace = async () => {
      if (link) {
        try {
          await this.api.deleteMedia(link.omekaId)
        } catch (e) {
          if (!e.isNotFound) throw e
        }
      }

      return this.api.createHtmlMedia(itemOmekaId, html, title)
    }

    let fingerprint = hash(html)

    if (link?.fingerprint === fingerprint) return

    let res = await replace()
    await this.links.set('notes', item.id, res['o:id'], fingerprint)
    result.notes = res['o:id']
  }

  async uploadItem(item, lists) {
    let { values, missing } =
      buildValues(item.metadata, this.api.properties, this.convertRules)

    missing.forEach(m => this.missing.add(m))

    let result = {
      id: item.id,
      title: titleOf(item.metadata),
      medias: [],
      errors: []
    }

    await this.verifyItem(item)

    let itemSets = await this.syncItemSets(item.lists, lists)
    let payload = itemPayload({ values, template: this.template, itemSets })

    let { status, omekaId } = await this.sync('item', item.id, hash(payload), {
      create: async () => {
        await this.clearChildLinks(item)
        return this.api.createItem(payload)
      },
      update: (id) => this.api.updateItem(id, payload)
    })

    result.status = status
    result.omekaId = omekaId

    for (let photo of item.photos)
      await this.syncMedia(photo, omekaId, result)

    try {
      await this.syncNotes(item, omekaId, result)
    } catch (e) {
      result.errors.push(`Notes: ${e.message}`)
    }

    if (result.errors.length) result.status = 'partial'
    return result
  }

  // Connects to Omeka and resets the state shared by a batch of items.
  async prepare() {
    this.itemSets = new Map()
    this.missing.clear()
    await this.api.connect()
  }

  // Like uploadItem, but turns an exception into a 'failed' result.
  async tryUploadItem(item, lists) {
    try {
      return await this.uploadItem(item, lists)
    } catch (e) {
      this.logger?.error({ stack: e.stack }, `failed to upload item ${item.id}`)
      return {
        id: item.id,
        title: titleOf(item.metadata),
        status: 'failed',
        errors: [e.message]
      }
    }
  }

  async run(items, lists = {}) {
    await this.prepare()

    let results = []
    let total = items.length

    for (let item of items) {
      this.onProgress({
        done: results.length,
        total,
        title: titleOf(item.metadata)
      })

      results.push(await this.tryUploadItem(item, lists))
    }

    this.onProgress({ done: total, total })

    return { results, missing: [...this.missing] }
  }
}
