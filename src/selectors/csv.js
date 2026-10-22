import { DEFAULT_CONVERT } from '../common/omeka/api.js'
import { convert, listPath, notesHtml } from '../common/omeka/payload.js'
import { URI, get } from '../common/util.js'
import { getExportItemIds } from './export.js'
import { getOmekaItems, getOmekaLists } from './omeka.js'

// Multiple values are joined with this. It can be entered as the multivalue
// separator in the Omeka S CSV Import module (values are trimmed there).
const SEPARATOR = '|'

const termOf = (ontology, uri) => {
  let [vocab, name] = URI.split(uri)
  let prefix = get(ontology, ['vocab', vocab, 'prefix'])
  return prefix ? `${prefix}:${name}` : uri
}

// Metadata columns: the fields of the items' templates, in template order,
// followed by any other property the items happen to have. Properties are
// converted the way the Omeka upload does (e.g. dc: to dcterms:), so that
// the CSV Import module can map the columns by name. Properties that end up
// as the same column are merged.
const getColumns = (state, items) => {
  let columns = new Map()
  let add = (uri) => {
    let key = convert(uri, DEFAULT_CONVERT)
    if (!columns.has(key)) columns.set(key, [])
    columns.get(key).push(uri)
  }

  for (let item of items)
    for (let field of get(state.ontology, ['template', item.template, 'fields'], []))
      add(field.property)

  for (let item of items)
    for (let uri of Object.keys(state.metadata[item.id] || {}))
      if (uri !== 'id' && uri !== 'pending') add(uri)

  for (let [key, uris] of columns)
    columns.set(key, [...new Set(uris)])

  return columns
}

// One row per item: its metadata, lists, photo files and notes as HTML.
export const getCSVExport = (state, props = {}) => {
  let ids = getExportItemIds(state, props)
  let columns = getColumns(state, ids.map(id => state.items[id]))
  let items = getOmekaItems(state, ids)
  let lists = getOmekaLists(state)

  let header = [
    ...[...columns.keys()].map(uri => termOf(state.ontology, uri)),
    'lists',
    'files',
    'notes'
  ]

  let rows = items.map(item => [
    ...[...columns.values()].map(uris =>
      uris.map(uri => item.metadata?.[uri]?.text).find(Boolean) ?? ''),
    item.lists.map(id => listPath(lists, id)).filter(Boolean).join(SEPARATOR),
    item.photos.map(photo => photo.path).join(SEPARATOR),
    notesHtml(item)
  ])

  return { header, rows }
}
