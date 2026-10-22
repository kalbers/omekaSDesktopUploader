import { toHTML } from '../editor/serialize.js'
import { getExportItemIds } from './export.js'

const noteHtml = (state, id) => {
  let note = state.notes[id]
  return (note?.state?.doc) ? toHTML(note.state.doc) : ''
}

const notesOf = (state, ids = []) =>
  ids.map(id => noteHtml(state, id)).filter(Boolean)

const toPhoto = (state, id) => {
  let photo = state.photos[id]

  return {
    id,
    path: photo.path,
    protocol: photo.protocol,
    filename: photo.filename,
    mimetype: photo.mimetype,
    checksum: photo.checksum,
    metadata: state.metadata[id],
    notes: notesOf(state, photo.notes)
  }
}

// Items in the shape the Omeka Uploader expects.
export const getOmekaItems = (state, ids) =>
  ids.map(id => {
    let item = state.items[id]

    return {
      id,
      metadata: state.metadata[id],
      lists: item.lists,
      photos: (item.photos || []).map(pid => toPhoto(state, pid))
    }
  })

export const getOmekaLists = ({ lists }) =>
  Object.fromEntries(
    Object.values(lists).map(({ id, name, parent }) => [id, { id, name, parent }]))

export const getOmekaUpload = (state, props = {}) => {
  let ids = getExportItemIds(state, props)

  return {
    items: getOmekaItems(state, ids),
    lists: getOmekaLists(state)
  }
}
