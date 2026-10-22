import fs from 'node:fs'
import { call, select } from 'redux-saga/effects'
import { Command } from '../command.js'
import { OMEKA } from '../../constants/index.js'
import { info, warn } from '../../common/log.js'
import { OmekaApi, Uploader } from '../../common/omeka/index.js'
import { getSettings, ipcFetch } from '../../common/omeka/ipc.js'
import { show } from '../../dialog.js'
import * as mod from '../../models/index.js'
import { getOmekaUpload } from '../../selectors/index.js'

const STATUS = {
  created: 'created',
  updated: 'updated',
  unchanged: 'unchanged',
  partial: 'uploaded with errors',
  failed: 'failed'
}

export const summarize = (results, missing) => {
  let count = (status) => results.filter(r => r.status === status).length
  let lines = []

  for (let status of Object.keys(STATUS)) {
    let n = count(status)
    if (n > 0) lines.push(`${n} ${n === 1 ? 'item' : 'items'} ${STATUS[status]}`)
  }

  let problems = results
    .filter(r => r.errors?.length)
    .flatMap(r => r.errors.map(e => `• ${r.title}: ${e}`))

  let detail = [...problems]

  if (missing.length)
    detail.push(
      '',
      'These properties don\'t exist in Omeka and were not uploaded:',
      ...missing.map(m => `• ${m}`))

  return {
    message: lines.join('\n') || 'Nothing to upload.',
    detail: detail.join('\n'),
    hasErrors: problems.length > 0
  }
}

export class Upload extends Command {
  *exec() {
    let { db } = this.options
    let { payload: ids } = this.action

    let settings = yield call(getSettings)

    if (!settings.url || !settings.keyIdentity || !settings.keyCredential) {
      yield call(show, 'message-box', {
        type: 'warning',
        message: 'Omeka S is not configured.',
        detail: 'Enter the API URL and keys in Preferences > Omeka S.'
      })
      return
    }

    let { items, lists } = yield select(state =>
      getOmekaUpload(state, { id: ids }))

    if (items.length === 0) return

    let api = new OmekaApi({
      url: settings.url,
      keyIdentity: settings.keyIdentity,
      keyCredential: settings.keyCredential
    }, { fetch: ipcFetch, logger: { info, warn } })

    let uploader = new Uploader({
      api,
      links: mod.omeka.store(db, api.baseUrl),
      template: Number(settings.template) || undefined,
      logger: { info, warn, error: warn },
      readFile: readPhoto
    })

    info(`uploading ${items.length} items to ${api.baseUrl}`)

    try {
      yield this.progress({ total: items.length })
      yield call([uploader, uploader.prepare])

      var results = []

      for (let item of items) {
        yield this.progress()
        results.push(yield call(
          [uploader, uploader.tryUploadItem], item, lists))
      }

    } catch (e) {
      warn({ stack: e.stack }, 'omeka upload failed')

      yield call(show, 'message-box', {
        type: 'error',
        message: 'Could not connect to Omeka S.',
        detail: e.message
      })
      return
    }

    let { message, detail, hasErrors } =
      summarize(results, [...uploader.missing])

    yield call(show, 'message-box', {
      type: hasErrors ? 'warning' : 'info',
      message,
      detail
    })

    return results
  }
}

Upload.register(OMEKA.UPLOAD)

function readPhoto(photo) {
  if (photo.protocol !== 'file')
    throw new Error(`cannot upload ${photo.protocol} photos`)

  return fs.promises.readFile(photo.path)
}
