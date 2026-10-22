import { webUtils } from 'electron'

import {
  DndProvider,
  useDragLayer,
  useDrag,
  useDrop,
  DragSource,
  DropTarget
} from 'react-dnd'

import {
  HTML5Backend,
  NativeTypes,
  getEmptyImage
} from 'react-dnd-html5-backend'

import {
  MIME
} from '../constants/index.js'

import {
  blank
} from '../common/util.js'

const DND = {
  ...NativeTypes,
  FIELD: 'field',
  ITEMS: 'items',
  LIST: 'list',
  PHOTO: 'photo',
  TEMPLATE: {
    FIELD: 'template.field'
  }
}

// Subtle: we cannot reliably detect folders while dragging;
// they are `kind` file and have an empty string as type
// which also matches other files without extensions.
const projectMimeTypes = [MIME.TTP, '']

const isProjectOrTemplateFile = ({ kind, type }) =>
  kind === 'file' && projectMimeTypes.includes(type)

const hasProjectFiles = (item) =>
  !!item.items.find(isProjectOrTemplateFile)

// Any file can be imported, and files with unknown extensions have an
// empty type while dragging, so every file drag is a candidate for import;
// the import command filters out what it cannot use.
const hasPhotoFiles = () => true

const getDroppedFiles = (item) => {
  let files = item.files?.map(webUtils.getPathForFile)
  let urls = item.urls

  if (!blank(files) || !blank(urls))
    return { files, urls }
}

export {
  DND,
  DndProvider,
  useDragLayer,
  useDrag,
  useDrop,
  DragSource,
  DropTarget,
  HTML5Backend as ElectronBackend,
  getDroppedFiles,
  getEmptyImage,
  hasProjectFiles,
  hasPhotoFiles
}
