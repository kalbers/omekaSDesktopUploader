import fs from 'node:fs'
import { call, select } from 'redux-saga/effects'
import { Command } from '../command.js'
import { ITEM } from '../../constants/index.js'
import { warn } from '../../common/log.js'
import { toCSV } from '../../common/csv.js'
import { fail, save } from '../../dialog.js'
import { getCSVExport } from '../../selectors/index.js'

const write = fs.promises.writeFile


// Exports items as CSV: one row per item with its metadata, lists, photo
// files and notes.
export class Export extends Command {
  *exec() {
    let { target } = this.action.meta
    let id = this.action.payload

    try {
      if (!target) {
        this.suspend()
        target = yield call(save.csv, {})
        this.resume()
      }

      if (!target) return

      let { header, rows } = yield select(state => getCSVExport(state, { id }))
      yield call(write, target, toCSV(header, rows))

    } catch (e) {
      warn({ stack: e.stack }, `failed to export items to ${target}`)
      fail(e, this.action.type)
    }
  }
}

Export.register(ITEM.EXPORT)
