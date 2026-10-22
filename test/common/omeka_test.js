import {
  OmekaApi,
  OmekaError,
  Uploader,
  buildValues,
  convert,
  ensureUrl,
  listPath,
  notesHtml,
  parseProps,
  parseVocabs
} from '#internal/common/omeka/index.js'

const DC = 'http://purl.org/dc/elements/1.1/'
const DCTERMS = 'http://purl.org/dc/terms/'

const PROPS = {
  [`${DCTERMS}title`]: { id: 1, term: 'dcterms:title' },
  [`${DCTERMS}description`]: { id: 4, term: 'dcterms:description' }
}

// A tiny in-memory stand-in for an Omeka S site.
class FakeOmeka {
  constructor() {
    this.seq = 100
    this.items = {}
    this.sets = {}
    this.media = {}
    this.calls = []
    this.properties = PROPS
  }

  connect = async () => PROPS

  notFound(what, id) {
    return new OmekaError(`${what} ${id} not found`, { status: 404 })
  }

  async get(path) {
    let [, type, id] = path.match(/^\/(\w+)\/(\d+)$/)
    let res = (type === 'items' ? this.items : this.sets)[id]
    if (!res) throw this.notFound(type, id)
    return {
      ...res,
      'o:media': Object.values(this.media)
        .filter(m => m.item === res['o:id'])
        .map(m => ({ 'o:id': m['o:id'] }))
    }
  }

  create(store, data) {
    let id = ++this.seq
    return (store[id] = { ...data, 'o:id': id })
  }

  update(store, id, data) {
    this.calls.push(['update', id])
    if (!store[id]) throw this.notFound('resource', id)
    return Object.assign(store[id], data)
  }

  createItem = async (data) => this.create(this.items, data)
  updateItem = async (id, data) => this.update(this.items, id, data)
  createItemSet = async (data) => this.create(this.sets, data)
  updateItemSet = async (id, data) => this.update(this.sets, id, data)
  updateMedia = async (id, data) => this.update(this.media, id, data)

  async deleteMedia(id) {
    if (!this.media[id]) throw this.notFound('media', id)
    delete this.media[id]
  }

  async createHtmlMedia(item, html, values) {
    return this.create(this.media, { item, html, kind: 'html', ...values })
  }

  async createFileMedia(item, file, values) {
    return this.create(this.media, { item, file, kind: 'file', ...values })
  }
}

const memoryLinks = () => {
  let map = new Map()
  return {
    map,
    get: async (t, id) => map.get(`${t}:${id}`),
    set: async (t, id, omekaId, fingerprint) =>
      map.set(`${t}:${id}`, { omekaId, fingerprint }),
    remove: async (t, id) => map.delete(`${t}:${id}`)
  }
}

const item = (title = 'Item', checksum = 'c1') => ({
  id: 1,
  metadata: {
    [`${DC}title`]: { type: 'string', text: title },
    [`${DCTERMS}description`]: { type: 'string', text: 'desc' },
    'http://example.org/unknown': { type: 'string', text: 'x' }
  },
  lists: [11],
  photos: [{
    id: 2,
    path: '/p.png',
    filename: 'p.png',
    mimetype: 'image/png',
    checksum,
    metadata: {},
    notes: ['<p>one</p>', '<p>two</p>']
  }]
})

const lists = {
  0: { id: 0, name: 'ROOT' },
  10: { id: 10, name: 'Parent', parent: 0 },
  11: { id: 11, name: 'Child', parent: 10 }
}

describe('common/omeka', () => {
  describe('api helpers', () => {
    it('ensureUrl accepts site and api urls', () => {
      expect(ensureUrl('http://x.org/s/')).to.eql('http://x.org/s/api')
      expect(ensureUrl('http://x.org/s/api/')).to.eql('http://x.org/s/api')
    })

    it('convert maps dc elements to dcterms', () => {
      expect(convert(`${DC}title`)).to.eql(`${DCTERMS}title`)
      expect(convert('http://other/title')).to.eql('http://other/title')
    })

    it('parseProps maps property uris to ids and terms', () => {
      let vocabs = parseVocabs([
        { 'o:prefix': 'dcterms', 'o:namespace_uri': DCTERMS }
      ])
      expect(parseProps(vocabs, [
        { 'o:id': 1, 'o:term': 'dcterms:title' },
        { 'o:id': 9, 'o:term': 'zzz:nope' }
      ])).to.eql({ [`${DCTERMS}title`]: { id: 1, term: 'dcterms:title' } })
    })

    it('request sends keys, json, and raises Omeka errors', async () => {
      let seen
      let api = new OmekaApi({
        url: 'http://x.org/api', keyIdentity: 'id', keyCredential: 'cred'
      }, {
        fetch: async (url, init) => {
          seen = { url, init }
          return {
            ok: false,
            status: 404,
            text: async () => '{"errors":{"error":"gone"}}'
          }
        }
      })

      let err = await api.patch('/items/1', { a: 1 }).catch(e => e)
      expect(err).to.be.instanceOf(OmekaError)
      expect(err.isNotFound).to.be.true
      expect(seen.url).to.match(/^http:\/\/x\.org\/api\/items\/1\?/)
      expect(seen.url).to.contain('key_identity=id')
      expect(seen.url).to.contain('key_credential=cred')
      expect(seen.init.method).to.eql('PATCH')
      expect(seen.init.body).to.eql('{"a":1}')
    })
  })

  describe('payload', () => {
    it('builds values and reports properties Omeka lacks', () => {
      let { values, missing } = buildValues(item().metadata, PROPS)
      expect(values['dcterms:title'][0]).to.eql({
        'type': 'literal', 'property_id': 1, '@value': 'Item'
      })
      expect(missing).to.eql(['http://example.org/unknown'])
    })

    it('names item sets after the list hierarchy', () => {
      expect(listPath(lists, 11)).to.eql('Parent / Child')
      expect(listPath(lists, 10)).to.eql('Parent')
    })

    it('joins photo notes', () => {
      expect(notesHtml(item())).to.eql('<p>one</p><hr/><p>two</p>')
    })
  })

  describe('Uploader', () => {
    let omeka, links, run

    beforeEach(() => {
      omeka = new FakeOmeka()
      links = memoryLinks()
      run = (items, opts = {}) => new Uploader({
        api: omeka,
        links,
        readFile: async () => Buffer.from('img'),
        ...opts
      }).run(items, lists)
    })

    it('creates item, item set, media and notes', async () => {
      let { results, missing } = await run([item()])

      expect(results[0]).to.include({ status: 'created', title: 'Item' })
      expect(results[0].errors).to.eql([])
      expect(Object.keys(omeka.items)).to.have.length(1)
      expect(Object.values(omeka.sets)[0]['dcterms:title'][0]['@value'])
        .to.eql('Parent / Child')
      expect(Object.values(omeka.items)[0]['o:item_set'])
        .to.eql([{ 'o:id': Object.values(omeka.sets)[0]['o:id'] }])
      expect(Object.values(omeka.media).map(m => m.kind).sort())
        .to.eql(['file', 'html'])
      expect(missing).to.eql(['http://example.org/unknown'])
      expect(links.map.size).to.eql(4)
    })

    it('does nothing when nothing changed', async () => {
      await run([item()])
      omeka.calls.length = 0
      let { results } = await run([item()])

      expect(results[0].status).to.eql('unchanged')
      expect(results[0].medias.map(m => m.status))
        .to.eql(['unchanged'])
      expect(omeka.calls).to.eql([])
      expect(Object.keys(omeka.items)).to.have.length(1)
    })

    it('updates item metadata in place', async () => {
      await run([item()])
      let id = links.map.get('item:1').omekaId
      let { results } = await run([item('Renamed')])

      expect(results[0]).to.include({ status: 'updated', omekaId: id })
      expect(omeka.items[id]['dcterms:title'][0]['@value']).to.eql('Renamed')
      expect(Object.keys(omeka.items)).to.have.length(1)
    })

    it('replaces media whose file changed, keeps the item', async () => {
      await run([item()])
      let before = links.map.get('media:2').omekaId
      let { results } = await run([item('Item', 'c2')])

      let now = links.map.get('media:2').omekaId
      expect(now).not.to.eql(before)
      expect(omeka.media[before]).to.be.undefined
      expect(results[0].status).to.eql('unchanged')
      expect(results[0].medias[0].status).to.eql('updated')
    })

    it('recreates resources deleted from Omeka', async () => {
      await run([item()])
      delete omeka.items[links.map.get('item:1').omekaId]
      let { results } = await run([item()])

      expect(results[0].status).to.eql('created')
      expect(Object.keys(omeka.items)).to.have.length(1)
      expect(results[0].medias.map(m => m.status))
        .to.eql(['created'])
    })

    it('recreates a deleted item set', async () => {
      await run([item()])
      omeka.sets = {}
      let { results } = await run([item()])

      expect(results[0].status).to.eql('updated')
      expect(Object.keys(omeka.sets)).to.have.length(1)
    })

    it('removes the notes media when all notes are gone', async () => {
      await run([item()])
      let gone = item()
      gone.photos[0].notes = []
      await run([gone])

      expect(Object.values(omeka.media).map(m => m.kind))
        .to.eql(['file'])
      expect(links.map.has('notes:1')).to.be.false
    })

    it('reports a failed photo without losing the item', async () => {
      let { results } = await run([item()], {
        readFile: async () => { throw new Error('ENOENT') }
      })

      expect(results[0].status).to.eql('partial')
      expect(results[0].errors[0]).to.match(/Photo 2.*ENOENT/)
      expect(links.map.has('item:1')).to.be.true
      expect(links.map.has('media:2')).to.be.false
    })

    it('keeps going after a failed item', async () => {
      omeka.createItem = async () => { throw new Error('boom') }
      let two = { ...item(), id: 7 }
      let { results } = await run([item(), two])

      expect(results.map(r => r.status)).to.eql(['failed', 'failed'])
    })
  })
})
