import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Asset } from './asset.js'
import {
  OCTET_STREAM,
  mimetypeFromExtension,
  mimetypeFromHead
} from './mimetypes.js'

const HEAD_SIZE = 8192

// Reads the start of a file, for sniffing its type.
export async function readHead(path, size = HEAD_SIZE) {
  let chunks = []
  let length = 0

  for await (let chunk of createReadStream(path, { start: 0, end: size - 1 })) {
    chunks.push(chunk)
    length += chunk.length
  }

  return Buffer.concat(chunks, length)
}

/*
 * A file which is not an image. Unlike an Image, its contents are never held
 * in memory: the checksum is computed while streaming, so files of any size
 * can be added. It offers the same interface as Image (pages, dimensions)
 * so that import and consolidation can treat both alike.
 */
export class FileAsset extends Asset {
  page = 0
  numPages = 1
  width = 0
  height = 0
  orientation = 1
  color = null
  density = null

  get done() {
    return !(this.page < this.numPages)
  }

  get data() {
    return {}
  }

  get description() {
    return undefined
  }

  next() {
    return ++this.page
  }

  rewind() {
    this.page = 0
  }

  // Files have no thumbnails to make.
  variants() {
    return []
  }

  async open() {
    try {
      if (this.isRemote)
        throw new Error('only local files can be added: ' + this.url)

      this.fs = await stat(this.path)

      if (!this.fs.isFile())
        throw new Error(`not a file: ${this.path}`)

      let hash = createHash('md5')
      let head

      for await (let chunk of createReadStream(this.path)) {
        if (head == null)
          head = chunk.subarray(0, HEAD_SIZE)

        hash.update(chunk)
      }

      this.checksum = hash.digest('hex')
      this.mimetype = this.#detect(head)

      // Consumers treat a buffer as "the file could be read".
      this.buffer = Buffer.alloc(0)

      return this

    } catch (e) {
      this.buffer = null
      this.checksum = null
      this.fs = null
      this.mimetype = null

      throw e
    }
  }

  #detect(head) {
    let byExtension = mimetypeFromExtension(this.basename)

    return (byExtension !== OCTET_STREAM) ?
      byExtension :
        (mimetypeFromHead(head) || OCTET_STREAM)
  }

  toJSON() {
    return {
      ...super.toJSON(),
      page: this.page,
      width: this.width,
      height: this.height,
      orientation: this.orientation,
      color: this.color,
      density: this.density
    }
  }
}
