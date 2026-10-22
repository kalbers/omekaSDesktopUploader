import { randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'

const CHUNK = 1024 * 1024

const quote = (s) =>
  String(s).replace(/[\r\n"]/g, c => ({ '\r': '%0D', '\n': '%0A', '"': '%22' })[c])

/**
 * Builds a multipart/form-data request body which streams its files from
 * disk. Neither fetch() with a FormData nor with a file-backed Blob does
 * this: both end up holding the whole file in memory.
 *
 * Returns the headers (with an exact Content-Length, so that servers need
 * not handle chunked uploads) and a Readable to pipe into the request. Send
 * it with node:http(s); fetch() buffers streamed request bodies.
 */
export async function multipart({ fields = [], files = [] }) {
  let boundary = `----odu${randomBytes(12).toString('hex')}`
  let parts = []
  let length = 0

  for (let [name, value] of fields) {
    let head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${quote(name)}"` +
      `\r\n\r\n${value}\r\n`)

    length += head.length
    parts.push({ head })
  }

  for (let { name, filename, mimetype, path } of files) {
    let { size } = await stat(path)
    let head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${quote(name)}"` +
      `; filename="${quote(filename)}"\r\nContent-Type: ` +
      `${mimetype || 'application/octet-stream'}\r\n\r\n`)

    length += head.length + size + 2
    parts.push({ head, path, size })
  }

  let tail = Buffer.from(`--${boundary}--\r\n`)
  length += tail.length

  async function* generate() {
    for (let { head, path, size } of parts) {
      yield head

      if (path) {
        let sent = 0

        for await (let chunk of createReadStream(path, {
          highWaterMark: CHUNK
        })) {
          sent += chunk.length
          yield chunk
        }

        // The Content-Length is already promised to the server.
        if (sent !== size)
          throw new Error(`file changed while uploading: ${path}`)

        yield Buffer.from('\r\n')
      }
    }

    yield tail
  }

  return {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(length)
    },
    body: Readable.from(generate(), { objectMode: false })
  }
}
