import { ImportCommand } from '../import.js'
import { DuplicateError } from '../../common/error.js'
import { info, warn } from '../../common/log.js'
import { Image } from '../../image/index.js'
import { fail } from '../../dialog.js'
import * as act from '../../actions/index.js'
import * as mod from '../../models/index.js'
import { ITEM, NAV } from '../../constants/index.js'

import {
  all,
  call,
  fork,
  join as wait,
  put,
  select
} from 'redux-saga/effects'

import {
  getItemTemplate,
  getPhotoTemplate
} from '../../selectors/index.js'

export class Import extends ImportCommand {
  *exec() {
    // Subtle: push items to this.result early to support
    // undo after cancelled (partial) import!
    this.result = []
    this.backlog = []

    yield * this.configure()

    yield this.progress({ progress: 0 })
    yield put(act.nav.update({ mode: NAV.MODE.PROJECT, query: '' }))

    let files = yield call(this.getFilesToImport)

    if (files.length === 0)
      return this.result

    yield this.progress({ total: files.length })

    let maxFail = 15
    let failures = 0

    for (let file of files) {
      try {
        yield * this.importFromImage(file)

      } catch (e) {
        warn({ stack: e.stack }, `failed to import "${file}"`)

        if (++failures < maxFail) {
          fail(e, this.action.type)
        }
      }
    }

    if (this.backlog.length > 0) {
      yield wait(this.backlog)
    }

    return this.result
  }

  *configure() {
    Object.assign(this.options, yield select(state => ({
      basePath: state.project.basePath,
      density: this.action.meta.density || state.settings.density,
      templates: {
        item: getItemTemplate(state),
        photo: getPhotoTemplate(state)
      },
      useLocalTimezone: state.settings.timezone
    })))
  }


  *importFromImage(path) {
    try {
      yield this.progress()

      let {
        basePath, density, db, templates, useLocalTimezone
      } = this.options

      let { list } = this.action.payload
      let item
      let photos = []

      let image = yield call([Image, Image.open], {
        path,
        density,
        useLocalTimezone
      })

      yield * this.handleDuplicate(image)
      let data = yield * this.getMetadata(image, templates)

      yield call(db.transaction, async tx => {
        item = await mod.item.create(tx, templates.item.id, data.item)

        while (!image.done) {
          let photo = await mod.photo.create(tx,
            { basePath, template: templates.photo.id },
            {
              item: item.id,
              image: image.toJSON(),
              data: data.photo
            })

          if (list) {
            await mod.list.items.add(tx, list, [item.id])
            item.lists.push(list)
          }

          item.photos.push(photo.id)

          photos.push({
            ...photo,
            consolidating: true
          })

          image.next()
        }
      })

      this.result.push(item.id)

      yield all([
        put(act.item.insert(item)),
        put(act.metadata.load([item.id, ...item.photos])),
        put(act.photo.insert(photos))
      ])

      image.rewind()

      this.backlog.push(
        yield fork(ImportCommand.consolidate, {
          cache: this.options.cache,
          image,
          photos: item.photos
        }))

    } catch (e) {
      if (e instanceof DuplicateError)
        info(`skipping duplicate "${path}"...`)
      else
        throw e
    }
  }

  get redo() {
    return (this.result && this.result.length > 0) ?
        act.item.restore(this.result) :
      null
  }

  get undo() {
    return (this.result && this.result.length > 0) ?
        act.item.delete(this.result) :
      null
  }
}

Import.register(ITEM.IMPORT)

