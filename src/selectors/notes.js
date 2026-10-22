import { createSelector as memo } from 'reselect'
import { seq, compose, cat, map, keep } from 'transducers.js'
import { getVisiblePhotos } from './photos.js'

const getNotes = ({ notes }) => notes
const getSelectedNoteId = ({ nav }) => nav.note

export const getSelectedNote = memo(
  getNotes, getSelectedNoteId, (notes, id) => notes[id]
)

export const getNoteParent = ({ notes, photos }, { id }) => {
  let { photo } = notes[id]
  let { item } = photos[photo]

  return { item, photo }
}

export const getVisibleNotes = memo(
  getNotes,
  getVisiblePhotos,

  (notes, photos) =>
    seq(photos, compose(
      map(parent => parent.notes),
      keep(),
      cat,
      map(id => notes[id]),
      keep()
    ))
)

export const getNextNoteSelection = memo(
  getSelectedNoteId,
  getVisibleNotes,
  (id, notes) => {
    let idx = notes.findIndex(note => note.id === id)

    if (idx === -1 || notes.length <= 1)
      return null

    let prev = notes[idx - 1]
    let cursor = notes[idx]
    let next = notes[idx + 1]

    if (prev == null)
      return next
    if (next == null)
      return prev

    if (next.photo === cursor.photo)
      return next
    if (prev.photo === cursor.photo)
      return prev

    return next
  }
)


export const getNotesMap = (state, props) =>
  props.notes.reduce((nmap, noteId) => {
    let { photo: id } = state.notes[noteId]

    if (nmap.has(id))
      nmap.get(id).notes.push(noteId)
    else
      nmap.set(id, {
        id,
        notes: [noteId]
      })

    return nmap

  }, new Map)
