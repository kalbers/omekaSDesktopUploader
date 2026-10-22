import { PANEL } from '../constants/index.js'
import { merge } from '../common/util.js'

const INIT = {}

export function panel(state = INIT, { type, payload }) {
  switch (type) {
    case PANEL.RESTORE:
      return merge(INIT, payload)
    case PANEL.UPDATE:
      return merge(state, payload)
    default:
      return state
  }
}
