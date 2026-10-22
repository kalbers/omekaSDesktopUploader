import { extname } from 'node:path'

// A project is a single SQLite file which links to the files it describes.
export const PROJECT_EXT = 'odu'

export const isProjectFile = (path) =>
  extname(path).toLowerCase() === `.${PROJECT_EXT}`
