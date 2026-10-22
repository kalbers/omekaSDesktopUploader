import { createServer } from 'node:http'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { OmekaSettings } from '#internal/main/omeka.js'

describe('OmekaSettings', () => {
  describe('#fetch', () => {
    let dir, server, url, received

    before(async () => {
      dir = await mkdtemp(join(tmpdir(), 'odu-omeka-'))

      server = createServer((req, res) => {
        let chunks = []
        req.on('data', chunk => chunks.push(chunk))
        req.on('end', () => {
          received = {
            headers: req.headers,
            body: Buffer.concat(chunks)
          }
          res.setHeader('Content-Type', 'application/json')
          res.end('{"ok":true}')
        })
      })

      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
      url = `http://127.0.0.1:${server.address().port}/api/media`
    })

    after(async () => {
      await new Promise(resolve => server.close(resolve))
      await rm(dir, { recursive: true, force: true })
    })

    it('streams a file from disk as multipart', async () => {
      let path = join(dir, 'movie.mp4')
      let bytes = Buffer.alloc(5 * 1024 * 1024, 0xab)
      await writeFile(path, bytes)

      let settings = new OmekaSettings(dir)
      let res = await settings.fetch({
        url,
        method: 'POST',
        form: {
          fields: [['data', '{"o:ingester":"upload"}']],
          files: [{
            name: 'file[]',
            path,
            filename: 'movie.mp4',
            mimetype: 'video/mp4'
          }]
        }
      })

      expect(res.ok).to.be.true
      expect(res.status).to.eql(200)
      expect(received.headers['content-type'])
        .to.match(/^multipart\/form-data; boundary=/)

      let body = received.body
      expect(body.length).to.be.above(bytes.length)
      expect(body.includes(bytes)).to.be.true

      let head = body.toString('latin1', 0, 400)
      expect(head).to.contain('name="data"')
      expect(head).to.contain('{"o:ingester":"upload"}')
      expect(body.toString('latin1').includes(
        'name="file[]"; filename="movie.mp4"')).to.be.true
      expect(body.toString('latin1').includes('video/mp4')).to.be.true
    })

    it('sends plain bodies unchanged', async () => {
      let settings = new OmekaSettings(dir)
      let res = await settings.fetch({
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"a":1}'
      })

      expect(res.ok).to.be.true
      expect(received.body.toString()).to.eql('{"a":1}')
    })
  })
})
