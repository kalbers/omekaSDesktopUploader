import { createHash } from 'node:crypto'
import { DEFAULT_CONVERT } from './api.js'

const TITLES = [
  'http://purl.org/dc/terms/title',
  'http://purl.org/dc/elements/1.1/title'
]

export const hash = (data) =>
  createHash('sha1')
    .update(typeof data === 'string' ? data : JSON.stringify(data))
    .digest('hex')

export const convert = (uri, rules = DEFAULT_CONVERT) => {
  for (let [from, to] of Object.entries(rules)) {
    if (uri.startsWith(from)) return uri.replace(from, to)
  }
  return uri
}

export const titleOf = (metadata = {}, fallback = '[Untitled]') => {
  for (let uri of TITLES) {
    let text = metadata[uri]?.text
    if (text) return text
  }
  return fallback
}

const isUri = ({ type }) => /anyURI$/.test(type)

// Tropy metadata ({ [propertyUri]: { type, text } }) to Omeka property values.
// Properties unknown to the Omeka site are returned in `missing`.
export const buildValues = (metadata = {}, properties = {}, rules) => {
  let values = {}
  let missing = []

  for (let [uri, value] of Object.entries(metadata)) {
    if (uri === 'id' || uri === 'pending' || value?.text == null) continue

    let prop = properties[convert(uri, rules)]

    if (!prop) {
      missing.push(uri)
      continue
    }

    values[prop.term] = [
      isUri(value) ?
          { 'type': 'uri', 'property_id': prop.id, '@id': value.text } :
          { 'type': 'literal', 'property_id': prop.id, '@value': value.text }
    ]
  }

  return { values, missing }
}

// Item set names follow the list hierarchy: "Parent / Child".
export const listPath = (lists, id) => {
  let names = []
  for (let list = lists[id]; list && list.id !== 0; list = lists[list.parent])
    names.unshift(list.name)
  return names.join(' / ')
}

export const itemPayload = ({ values, template, itemSets }) => ({
  ...values,
  ...(template ? { 'o:resource_template': { 'o:id': template } } : {}),
  'o:item_set': itemSets.map(id => ({ 'o:id': id }))
})

export const notesHtml = (item) => {
  let notes = []

  for (let photo of item.photos)
    notes.push(...photo.notes)

  return notes.join('<hr/>')
}
