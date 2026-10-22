import { mkprojtmp } from '../support/project.js'
import { mktmp } from '../support/tmp.js'
import { create, open } from '#internal/common/project.js'
import { Migrations } from '#internal/res.js'
import mod from '#internal/models/omeka.js'

describe('models.omeka', () => {
  let project = mkprojtmp('omeka.tpy')
  let URL = 'http://localhost/omeka-s/api'

  it('remembers and updates links', async () => {
    let { db } = project.current
    expect(await mod.get(db, URL, 'item', 1)).to.be.undefined

    await mod.set(db, URL, 'item', 1, 100, 'abc')
    expect(await mod.get(db, URL, 'item', 1))
      .to.eql({ omekaId: 100, fingerprint: 'abc' })

    await mod.set(db, URL, 'item', 1, 100, 'def')
    expect((await mod.get(db, URL, 'item', 1)).fingerprint).to.eql('def')

    await mod.remove(db, URL, 'item', 1)
    expect(await mod.get(db, URL, 'item', 1)).to.be.undefined
  })

  it('keeps links separate per site and type', async () => {
    let { db } = project.current
    await mod.set(db, URL, 'item', 1, 100, 'a')
    await mod.set(db, URL, 'media', 1, 200, 'b')
    await mod.set(db, 'http://other/api', 'item', 1, 300, 'c')

    expect((await mod.get(db, URL, 'item', 1)).omekaId).to.eql(100)
    expect((await mod.get(db, URL, 'media', 1)).omekaId).to.eql(200)
    expect((await mod.get(db, 'http://other/api', 'item', 1)).omekaId)
      .to.eql(300)
  })

  it('rejects unknown types', async () => {
    let { db } = project.current
    await mod.set(db, URL, 'bogus', 1, 1, 'x')
      .then(() => { throw new Error('expected failure') },
        e => expect(e.message).to.match(/constraint/i))
  })

  it('drops links when the local resource is deleted', async () => {
    let { db } = project.current
    await db.run('INSERT INTO subjects (id) VALUES (900)')
    await db.run('INSERT INTO lists (list_id, name, parent_list_id) VALUES (901, ?, 0)', 'L')

    await mod.set(db, URL, 'item', 900, 1, 'a')
    await mod.set(db, URL, 'notes', 900, 2, 'a')
    await mod.set(db, URL, 'item_set', 901, 3, 'a')
    await mod.set(db, URL, 'item', 902, 4, 'a')

    await db.run('DELETE FROM subjects WHERE id = 900')
    await db.run('DELETE FROM lists WHERE list_id = 901')

    expect(await mod.get(db, URL, 'item', 900)).to.be.undefined
    expect(await mod.get(db, URL, 'notes', 900)).to.be.undefined
    expect(await mod.get(db, URL, 'item_set', 901)).to.be.undefined
    expect(await mod.get(db, URL, 'item', 902)).to.exist
  })

  describe('migration', () => {
    it('upgrades an existing project', async () => {
      let path = mktmp('old.tpy')
      let pre = await create(path, F.schema('project').path, F.appDir, {
        autoclose: false
      })

      // simulate a project made before the migration existed
      await pre.run('DROP TRIGGER delete_omeka_links_on_subject_delete')
      await pre.run('DROP TRIGGER delete_omeka_links_on_list_delete')
      await pre.run('DROP TABLE omeka_links')
      await pre.run('DELETE FROM migrations WHERE number = 2610221200')
      await pre.close()

      let [db] = await open(path, { migrate: Migrations.project })

      expect(await db.get(
        "SELECT count(*) AS n FROM sqlite_schema WHERE name LIKE '%omeka_links%'"
      )).to.have.property('n', 3)
      await db.close()
    })
  })
})
