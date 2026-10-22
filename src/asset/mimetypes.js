import { extname } from 'node:path'
import IMAGE from '../constants/image.js'

// Media types for files which are not images, by extension. Omeka S decides
// what it accepts, so this only needs to be good enough to label files and
// to send a sensible Content-Type with an upload.
const TYPES = {
  // audio
  'aac': 'audio/aac', 'aif': 'audio/aiff', 'aiff': 'audio/aiff',
  'flac': 'audio/flac', 'm4a': 'audio/mp4', 'mid': 'audio/midi', 'midi': 'audio/midi',
  'mp3': 'audio/mpeg', 'oga': 'audio/ogg', 'ogg': 'audio/ogg', 'opus': 'audio/ogg',
  'wav': 'audio/wav', 'weba': 'audio/webm', 'wma': 'audio/x-ms-wma',

  // video
  'avi': 'video/x-msvideo', 'flv': 'video/x-flv', 'm4v': 'video/x-m4v',
  'mkv': 'video/x-matroska', 'mov': 'video/quicktime', 'mp4': 'video/mp4',
  'mpe': 'video/mpeg', 'mpeg': 'video/mpeg', 'mpg': 'video/mpeg', 'ogv': 'video/ogg',
  'webm': 'video/webm', 'wmv': 'video/x-ms-wmv', '3gp': 'video/3gpp',

  // documents
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'epub': 'application/epub+zip',
  'odp': 'application/vnd.oasis.opendocument.presentation',
  'ods': 'application/vnd.oasis.opendocument.spreadsheet',
  'odt': 'application/vnd.oasis.opendocument.text',
  'pages': 'application/vnd.apple.pages',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'rtf': 'application/rtf',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // text and data
  'csv': 'text/csv', 'htm': 'text/html', 'html': 'text/html', 'ics': 'text/calendar',
  'json': 'application/json', 'md': 'text/markdown', 'tsv': 'text/tab-separated-values',
  'txt': 'text/plain', 'xml': 'application/xml', 'yaml': 'application/yaml',
  'yml': 'application/yaml',

  // archives
  '7z': 'application/x-7z-compressed', 'bz2': 'application/x-bzip2',
  'gz': 'application/gzip', 'rar': 'application/vnd.rar', 'tar': 'application/x-tar',
  'zip': 'application/zip',

  // images the image pipeline cannot read
  'bmp': 'image/bmp', 'ico': 'image/vnd.microsoft.icon', 'jxl': 'image/jxl',

  // 3D and other
  'glb': 'model/gltf-binary', 'gltf': 'model/gltf+json', 'obj': 'model/obj',
  'stl': 'model/stl', 'swf': 'application/x-shockwave-flash',
  'ttf': 'font/ttf', 'otf': 'font/otf', 'woff': 'font/woff', 'woff2': 'font/woff2'
}

export const OCTET_STREAM = 'application/octet-stream'

// Types the image pipeline can read and make thumbnails of.
export const isImageType = (mimetype) =>
  !!IMAGE.SUPPORTED[mimetype]

// A stored type which is not an image, so it is shown as a file.
// (An unknown type is assumed to be an image.)
export const isFileType = (mimetype) =>
  !!mimetype && !isImageType(mimetype)

export const extension = (path = '') =>
  extname(path).slice(1).toLowerCase()

export const mimetypeFromExtension = (path) =>
  TYPES[extension(path)] || OCTET_STREAM

// A few formats are recognizable by their first bytes, which helps when a
// file has a missing or misleading extension.
const SIGNATURES = [
  [(h) => h[0] === 0x50 && h[1] === 0x4B && h[2] === 3 && h[3] === 4, 'application/zip'],
  [(h) => h[0] === 0x1F && h[1] === 0x8B, 'application/gzip'],
  [(h, a) => a.startsWith('OggS'), 'audio/ogg'],
  [(h, a) => a.startsWith('ID3'), 'audio/mpeg'],
  [(h, a) => a.startsWith('fLaC'), 'audio/flac'],
  [(h, a) => a.startsWith('RIFF') && a.slice(8, 12) === 'WAVE', 'audio/wav'],
  [(h, a) => a.startsWith('RIFF') && a.slice(8, 12) === 'AVI ', 'video/x-msvideo'],
  [(h, a) => a.slice(4, 8) === 'ftyp', 'video/mp4']
]

export const mimetypeFromHead = (head) => {
  if (head == null || head.length < 4) return null

  let ascii = head.toString('latin1', 0, 12)
  let found = SIGNATURES.find(([test]) => test(head, ascii))

  return found ? found[1] : null
}

// A coarse category, used to pick an icon.
export const fileKind = (mimetype = OCTET_STREAM) => {
  let [type, subtype = ''] = mimetype.toLowerCase().split('/')

  if (type === 'audio') return 'audio'
  if (type === 'video') return 'video'
  if (type === 'image') return 'image'
  if (type === 'font' || type === 'model') return 'file'

  if (type === 'text' || subtype.includes('json') || subtype.includes('xml'))
    return 'text'
  if (/spreadsheet|ms-excel|csv/.test(subtype)) return 'spreadsheet'
  if (/presentation|powerpoint/.test(subtype)) return 'presentation'
  if (/zip|tar|gzip|bzip|7z|rar|compressed/.test(subtype)) return 'archive'
  if (/word|document|rtf|epub|pdf|pages|opendocument\.text/.test(subtype))
    return 'document'

  return 'file'
}
