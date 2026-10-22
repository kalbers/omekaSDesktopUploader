import ARGS from '../args.js'
import { SETTINGS, ITEM, PHOTO, ESPER, NOTE } from '../constants/index.js'
import { darwin } from '../common/os.js'
import { merge } from '../common/util.js'
import { dcterms } from '../ontology/ns.js'

const defaults = {
  completions: 'datatype',
  dup: 'prompt',
  density: 72,
  layout: ITEM.LAYOUT.STACKED,
  localtime: true,
  maximize: 'none',
  templates: {
    item: ITEM.TEMPLATE.DEFAULT,
    photo: PHOTO.TEMPLATE.DEFAULT
  },
  theme: ARGS.theme,
  title: {
    item: dcterms.title,
    photo: dcterms.title,
    force: false
  },
  overlayToolbars: ARGS.frameless,
  invertScroll: true,
  invertZoom: darwin,
  zoomMode: ESPER.MODE.FIT
}

export function settings(state = defaults, { type, payload, meta, error }) {
  switch (type) {
    case SETTINGS.RESTORE:
      return {
        ...merge(defaults, payload),
        fontSize: ARGS.fontSize,
        theme: ARGS.theme,
        locale: ARGS.locale
      }
    case SETTINGS.UPDATE:
      return merge(state, payload)
    case NOTE.OPEN:
      return (!meta.done || error || state.maximize !== 'esper') ? state : {
        ...state,
        maximize: 'none'
      }
    default:
      return state
  }
}
