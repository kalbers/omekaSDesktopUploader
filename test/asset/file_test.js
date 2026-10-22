import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mkdtmp } from '../support/tmp.js'
import { FileAsset, readHead } from '#internal/asset/file.js'
import {
  OCTET_STREAM,
  fileKind,
  mimetypeFromExtension,
  mimetypeFromHead
} from '#internal/asset/mimetypes.js'
import { checkAsset, isImageType, openAsset } from '#internal/image/open.js'
import { Image } from '#internal/image/image.js'

const md5 = (data) => createHash('md5').update(data).digest('hex')

describe('non-image files', () => {
  let tmp = mkdtmp()

  describe('mimetypes', () => {
    it('knows common types by extension', () => {
      expect(mimetypeFromExtension('a/b/song.MP3')).to.eql('audio/mpeg')
      expect(mimetypeFromExtension('movie.mov')).to.eql('video/quicktime')
      expect(mimetypeFromExtension('notes.docx')).to.contain('wordprocessingml')
      expect(mimetypeFromExtension('data.zip')).to.eql('application/zip')
    })

    it('falls back to octet-stream', () => {
      expect(mimetypeFromExtension('mystery.qqq')).to.eql(OCTET_STREAM)
      expect(mimetypeFromExtension('noextension')).to.eql(OCTET_STREAM)
    })

    it('recognizes a few formats by their first bytes', () => {
      expect(mimetypeFromHead(Buffer.from('OggS\0\0\0\0'))).to.eql('audio/ogg')
      expect(mimetypeFromHead(Buffer.from([0x50, 0x4B, 3, 4, 0])))
        .to.eql('application/zip')
      expect(mimetypeFromHead(Buffer.from('plain text'))).to.be.null
      expect(mimetypeFromHead(null)).to.be.null
    })

    it('groups types into kinds for icons', () => {
      expect(fileKind('audio/mpeg')).to.eql('audio')
      expect(fileKind('video/mp4')).to.eql('video')
      expect(fileKind('application/zip')).to.eql('archive')
      expect(fileKind('application/vnd.ms-excel')).to.eql('spreadsheet')
      expect(fileKind('application/vnd.ms-powerpoint')).to.eql('presentation')
      expect(fileKind('text/plain')).to.eql('text')
      expect(fileKind('application/json')).to.eql('text')
      expect(fileKind('application/msword')).to.eql('document')
      expect(fileKind('application/pdf')).to.eql('document')
      expect(fileKind(OCTET_STREAM)).to.eql('file')
      expect(fileKind(undefined)).to.eql('file')
    })
  })

  describe('FileAsset', () => {
    it('records checksum, size and type without keeping the contents', async () => {
      let path = join(tmp, 'notes.txt')
      let data = Buffer.from('some notes\n'.repeat(1000))
      await writeFile(path, data)

      let file = await FileAsset.open({ path })

      expect(file.checksum).to.eql(md5(data))
      expect(file.mimetype).to.eql('text/plain')
      expect(file.size).to.eql(data.length)
      expect(file.filename).to.eql('notes.txt')
      expect(file.protocol).to.eql('file')
      expect(file.buffer.length).to.eql(0)
    })

    it('hashes files larger than one read chunk', async () => {
      let path = join(tmp, 'big.bin')
      let data = Buffer.alloc(5 * 1024 * 1024, 7)
      await writeFile(path, data)

      let file = await FileAsset.open({ path })

      expect(file.checksum).to.eql(md5(data))
      expect(file.size).to.eql(data.length)
    })

    it('sniffs the type when the extension says nothing', async () => {
      let path = join(tmp, 'blob')
      await writeFile(path, Buffer.concat([
        Buffer.from([0x50, 0x4B, 3, 4]), Buffer.alloc(32)
      ]))

      expect((await FileAsset.open({ path })).mimetype)
        .to.eql('application/zip')
    })

    it('behaves like a one-page image with no dimensions', async () => {
      let path = join(tmp, 'a.mp3')
      await writeFile(path, 'x')
      let file = await FileAsset.open({ path })

      expect(file.done).to.be.false
      file.next()
      expect(file.done).to.be.true
      file.rewind()
      expect(file.done).to.be.false

      expect(file.variants()).to.eql([])
      expect(file.toJSON()).to.include({
        width: 0, height: 0, orientation: 1, page: 0, mimetype: 'audio/mpeg'
      })
    })

    it('rejects missing files and directories', async () => {
      await expect(FileAsset.open({ path: join(tmp, 'nope.txt') }))
        .to.eventually.be.rejected
      await expect(FileAsset.open({ path: tmp })).to.eventually.be.rejected
    })

    it('does not accept remote files', async () => {
      await expect(FileAsset.open({ path: 'https://example.org/a.mp3' }))
        .to.eventually.be.rejectedWith('only local files')
    })

    it('detects changes when checked', async () => {
      let path = join(tmp, 'check.txt')
      await writeFile(path, 'one')
      let { checksum } = await FileAsset.open({ path })

      let same = await FileAsset.check({ path, checksum })
      expect(same.hasChanged).to.be.false

      await writeFile(path, 'two')
      let changed = await FileAsset.check({ path, checksum })
      expect(changed.hasChanged).to.be.true

      let missing = await FileAsset.check({ path: join(tmp, 'gone'), checksum })
      expect(missing.hasChanged).to.be.true
      expect(missing.error).to.exist
    })

    it('reads only the start of a file for sniffing', async () => {
      let path = join(tmp, 'head.bin')
      await writeFile(path, Buffer.alloc(100000, 1))
      expect((await readHead(path)).length).to.eql(8192)
    })
  })

  describe('openAsset', () => {
    it('opens images as images', async () => {
      let asset = await openAsset({ path: F.images('PA140105.JPG').path })

      expect(asset).to.be.instanceOf(Image)
      expect(asset.mimetype).to.eql('image/jpeg')
      expect(asset.width).to.be.above(0)
    })

    it('opens everything else as a plain file', async () => {
      let path = join(tmp, 'sound.wav')
      await writeFile(path, 'RIFF\0\0\0\0WAVE')

      let asset = await openAsset({ path })

      expect(asset).to.be.instanceOf(FileAsset)
      expect(asset.mimetype).to.eql('audio/wav')
    })

    it('checks stored files according to their stored type', async () => {
      let path = join(tmp, 'doc.txt')
      await writeFile(path, 'text')
      let { checksum } = await FileAsset.open({ path })

      let checked = await checkAsset({ path, checksum, mimetype: 'text/plain' })
      expect(checked).to.be.instanceOf(FileAsset)
      expect(checked.hasChanged).to.be.false

      let img = await checkAsset({
        path: F.images('PA140105.JPG').path,
        mimetype: 'image/jpeg'
      })
      expect(img).to.be.instanceOf(Image)
    })

    it('tells image types from others', () => {
      expect(isImageType('image/png')).to.be.true
      expect(isImageType('application/pdf')).to.be.true
      expect(isImageType('audio/mpeg')).to.be.false
      expect(isImageType(undefined)).to.be.false
    })
  })
})
