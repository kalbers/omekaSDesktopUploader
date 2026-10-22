import { isSelected, select } from '../selection.js'
import { merge, insert, omit, splice } from '../common/util.js'
import { dcterms } from '../ontology/ns.js'

import {
  EDIT,
  NAV,
  ITEM,
  LIST,
  NOTE,
  PHOTO
} from '../constants/index.js'

const reset = {
  items: [],
  photo: null,
  note: null
}

const init = {
  ...reset,
  mode: NAV.MODE.PROJECT,
  query: '',
  sort: {},
  columns: [
    { width: 250, id: dcterms.title },
    { width: 100, id: dcterms.creator },
    { width: 100, id: dcterms.date },
    { width: 100, id: dcterms.type },
    { width: 190, id: NAV.COLUMN.CREATED.id }
  ]
}

// eslint-disable-next-line complexity
export function nav(state = init, { type, payload, meta, error }) {
  switch (type) {
    case NAV.RESTORE:
      return merge(init, omit(payload || {}, ['query']))
    case NAV.UPDATE:
      return { ...state, ...payload }

    case NAV.SEARCH:
      return {
        ...state,
        ...reset,
        ...payload
      }

    case NAV.SORT: {
      const { list, ...sort } = payload

      return {
        ...state,
        sort: {
          ...state.sort,
          [list || 0]: sort
        }
      }
    }

    case LIST.REMOVE: {
      return (state.list !== payload) ? state : {
        ...state,
        ...reset,
        list: null
      }
    }
    case LIST.COLLAPSE: {
      return !meta.select ? state : {
        ...state,
        ...reset,
        list: payload
      }
    }
    case LIST.ITEM.REMOVE: {
      return meta.done ? state : {
        ...state,
        ...reset
      }
    }

    case ITEM.DELETE:
    case ITEM.RESTORE:
    case ITEM.REMOVE:
      return meta.done || !isSelected(state.items, payload) ?
        state : {
          ...state,
          ...reset
        }

    case ITEM.SELECT:
      return {
        ...state,
        photo: payload.photo,
        note: payload.note,
        items: select(state.items, payload.items, meta.mod)
      }

    case ITEM.OPEN: {
      let { id, photo, note } = payload
      return (!meta.done || error) ? state : {
        ...state,
        mode: NAV.MODE.ITEM,
        items: select(state.items, [id], 'replace'),
        photo,
        note
      }
    }
    case NOTE.OPEN: {
      let { item, photo, note } = payload
      return (!meta.done || error) ? state : {
        ...state,
        mode: NAV.MODE.ITEM,
        items: select(state.items, [item], 'replace'),
        photo,
        note
      }
    }
    case EDIT.START:
      if (state.mode === NAV.MODE.PROJECT) return state
      if (!payload.list) return state

      return {
        ...state,
        mode: NAV.MODE.PROJECT
      }

    case PHOTO.SELECT:
      return payload ? {
        ...state,
        photo: payload.photo,
        note: payload.note,
        items: [payload.item]
      } : { ...state, photo: null }

    case NOTE.SELECT:
      return payload ? {
        ...state,
        items: [payload.item],
        photo: payload.photo,
        note: payload.note
      } : { ...state, note: null }

    case ITEM.PHOTO.REMOVE:
      return isSelected(state.items, payload.id) &&
        payload.photos.includes(state.photo) ?
          { ...state, photo: null, note: null } : state

    case NAV.SELECT:
      return {
        ...state,
        ...reset,
        list: null,
        trash: null,
        imports: null,
        ...payload
      }

    case NAV.COLUMN.INSERT:
      return {
        ...state,
        columns: insert(state.columns, meta.idx, payload)
      }
    case NAV.COLUMN.REMOVE:
      return {
        ...state,
        columns: state.columns.filter(col => col.id !== payload.id)
      }
    case NAV.COLUMN.ORDER: {
      const { order } = payload

      return {
        ...state,
        columns: state.columns.reduce((cols, c) =>
          ((cols[order[c.id]] = c), cols), [])
      }
    }
    case NAV.COLUMN.RESIZE: {
      const { column, width } = payload

      return {
        ...state,
        columns: splice(state.columns, column, 1, {
          ...state.columns[column], width
        })
      }
    }

    default:
      return state
  }
}
