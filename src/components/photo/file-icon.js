import { Icon } from '../icons.js'
import { fileKind } from '../../asset/mimetypes.js'

const ICONS = {
  archive: 'FileArchive',
  audio: 'FileAudio',
  document: 'FileDocument',
  image: 'FileImage',
  presentation: 'FilePresentation',
  spreadsheet: 'FileSpreadsheet',
  text: 'FileText',
  video: 'FileVideo'
}

export const iconNameFor = (mimetype) =>
  ICONS[fileKind(mimetype)] || 'File'

// An icon standing in for a file which has no thumbnail.
export const FileIcon = ({ mimetype }) => (
  <Icon name={iconNameFor(mimetype)}/>
)
