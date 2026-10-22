import { dc, dcterms } from './ns.js'
import { isTemplateVisible } from './visibility.js'

// Settings and list layouts saved by earlier versions refer to Dublin Core
// Elements (dc:) and Tropy's own item templates. Translate them to what the
// interface offers now.

export const upgradeProperty = (uri) =>
  (typeof uri === 'string' && uri.startsWith(dc.BASE)) ?
    dcterms.BASE + uri.slice(dc.BASE.length) :
    uri

export const upgradeTemplate = (id, fallback) =>
  (id == null || isTemplateVisible(id)) ? id : fallback

export const upgradeColumns = (columns) =>
  Array.isArray(columns) ?
      columns.map(col => ({ ...col, id: upgradeProperty(col?.id) })) :
    columns

export const upgradeSort = (sort) =>
  (sort == null || typeof sort !== 'object') ? sort :
      Object.fromEntries(Object.entries(sort).map(([list, s]) => [
        list,
        (s && typeof s === 'object') ?
            { ...s, column: upgradeProperty(s.column) } : s
      ]))
