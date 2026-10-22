import { stat, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mkprojtmp } from '../support/project.js'
import { mkdtmp } from '../support/tmp.js'
import {
  PROJECT_EXT,
  create,
  isProjectFile,
  load,
  open,
  pstat
} from '#internal/common/project.js'
import { delay } from '#internal/common/util.js'

describe('common/project', () => {
  describe('isProjectFile', () => {
    it('accepts the project extension, ignoring case', () => {
      expect(PROJECT_EXT).to.eql('odu')
      expect(isProjectFile('a/b/Test.odu')).to.be.true
      expect(isProjectFile('TEST.ODU')).to.be.true
    })

    it('rejects everything else, including Tropy projects', () => {
      for (let path of ['a.tpy', 'a.tropy', 'a.mtpy', 'a.txt', 'a', 'odu'])
        expect(isProjectFile(path), path).to.be.false
    })
  })

  describe('create', () => { // Used by mkprojtmp under the hood!
    let tmp = mkdtmp()
    let project = mkprojtmp('test.odu', { id: 'abc123', name: 'Daedalus' })

    it('creates a single project file', async () => {
      let { db, path } = project.current

      expect((await stat(path)).isFile()).to.be.true

      let row = await db.get('select * from project')

      expect(row).to.have.property('name', 'Daedalus')
      expect(row).to.have.property('base', null)
      expect(row).to.have.property('project_id', 'abc123')

      expect(await db.version()).to.be.a('number').above(1601010000)
    })

    it('rejects other file extensions', async () => {
      for (let name of ['tropy.db', 'old.tpy', 'old.tropy'])
        await expect(create(join(tmp, name), F.schema('project').path))
          .to.eventually.be.rejectedWith('project files must end in .odu')
    })

    it('rejects unknown project bases', () =>
      expect(create(join(tmp, 'b.odu'), F.schema('project').path, {
        base: '/somewhere'
      })).to.eventually.be.rejectedWith('base not supported'))

    it('rejects if the file already exists', async () => {
      let path = join(tmp, 'file.odu')
      await writeFile(path, '')

      await expect(create(path, F.schema('project').path))
        .to.eventually.be.rejectedWith('project file exists')
    })

    it('rejects if a directory of that name exists', async () => {
      let path = join(tmp, 'dir.odu')
      await mkdir(path)

      await expect(create(path, F.schema('project').path))
        .to.eventually.be.rejectedWith('project file exists')
    })
  })

  describe('load', () => {
    let project = mkprojtmp('test.odu', { name: 'Daedalus' })

    it('returns project info', async () => {
      let { db, path } = project.current
      let info = await load(db)

      expect(info.name).to.equal('Daedalus')
      expect(info.base).to.be.null
      expect(info.path).to.equal(path)
      expect(info).not.to.have.property('isManaged')
      expect(info).not.to.have.property('store')
    })
  })

  describe('open', () => {
    let project = mkprojtmp('test.odu', { name: 'Daedalus' })

    it('opens a project file', async () => {
      let [db, info] = await open(project.current.path)

      expect(info.name).to.equal('Daedalus')
      expect(info.path).to.equal(project.current.path)

      await db.close()
    })
  })

  describe('pstat', () => {
    let project = mkprojtmp('test.odu', { name: 'Daedalus' })

    it('returns project stats', async () => {
      let stats = await pstat(project.current.path)

      expect(stats).to.have.property('name', 'Daedalus')
      expect(stats).to.have.property('path', project.current.path)
      expect(stats).to.have.property('items', 0)
      expect(stats).to.have.property('photos', 0)
      expect(stats).to.have.property('notes', 0)
    })

    it('returns null if file not modifed since', async () => {
      await delay(100)
      expect(await pstat(project.current.path, Date.now())).to.be.null
    })

    it('rejects missing files', () =>
      expect(pstat('test.odu'))
        .to.eventually.be.rejectedWith('ENOENT'))
  })
})
