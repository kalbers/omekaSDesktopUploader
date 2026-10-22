import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { multipart } from '#internal/main/multipart.js'

const read = async (stream) => {
  let chunks = []
  for await (let chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

describe('multipart', () => {
  let dir

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'odu-multipart-'))
  })

  after(() => rm(dir, { recursive: true, force: true }))

  it('declares the exact length of the body it produces', async () => {
    let path = join(dir, 'a.bin')
    await writeFile(path, Buffer.alloc(3 * 1024 * 1024 + 17, 7))

    let { headers, body } = await multipart({
      fields: [['data', '{"a":1}']],
      files: [{ name: 'file[]', path, filename: 'a.bin', mimetype: '' }]
    })

    let bytes = await read(body)

    expect(Number(headers['Content-Length'])).to.eql(bytes.length)
    expect(bytes.toString('latin1')).to.contain(
      'Content-Type: application/octet-stream')
  })

  it('escapes quotes and line breaks in names', async () => {
    let path = join(dir, 'b.txt')
    await writeFile(path, 'x')

    let { body } = await multipart({
      files: [{ name: 'file[]', path, filename: 'a"b\r\nc.txt' }]
    })

    let text = (await read(body)).toString()
    expect(text).to.contain('filename="a%22b%0D%0Ac.txt"')
  })

  it('fails when the file changes size while uploading', async () => {
    let path = join(dir, 'c.bin')
    await writeFile(path, 'abc')

    let { body } = await multipart({
      files: [{ name: 'file[]', path, filename: 'c.bin' }]
    })

    await writeFile(path, 'abcdef')

    let err = await read(body).catch(e => e)
    expect(err).to.be.instanceOf(Error)
    expect(err.message).to.match(/changed while uploading/)
  })
})
