import { mkprojtmp } from '../support/project.js'
import { open } from '#internal/common/project.js'
import { Migrations } from '#internal/res.js'

const DC = 'http://purl.org/dc/elements/1.1/'
const DCT = 'http://purl.org/dc/terms/'
const GENERIC = 'https://tropy.org/v1/templates/generic'
const DUBLIN = 'https://tropy.org/v1/templates/dc'
const NUMBER = 2610221600

// Writes a project as an earlier version would have left it
const legacy = async (db) => {
  await db.run('DELETE FROM migrations WHERE number = ?', NUMBER)
  await db.run('INSERT INTO subjects (id, template, type) VALUES (1, ?, ?)', GENERIC, 'Item')
  await db.run('INSERT INTO subjects (id, template, type) VALUES (2, ?, ?)', 'https://tropy.org/v1/templates/photo', 'Photo')
  await db.run("INSERT INTO metadata_values (value_id, datatype, text) VALUES (1, 'x', 'Old title'), (2, 'x', 'Both'), (3, 'x', 'New'), (4, 'x', 'Kept')")
  await db.run('INSERT INTO metadata (id, property, value_id) VALUES (1, ?, 1)', `${DC}title`)
  await db.run('INSERT INTO metadata (id, property, value_id) VALUES (1, ?, 4)', `${DC}rights`)
  // an item which has both the old and the new property
  await db.run('INSERT INTO metadata (id, property, value_id) VALUES (2, ?, 2)', `${DC}date`)
  await db.run('INSERT INTO metadata (id, property, value_id) VALUES (2, ?, 3)', `${DCT}date`)
}

describe('Dublin Core Terms project migration', () => {
  let project = mkprojtmp('dc.odu')

  const migrated = async () => {
    let { db, path } = project.current
    await legacy(db)
    await db.close()

    let [reopened] = await open(path, { migrate: Migrations.project })
    project.current.db = reopened
    return reopened
  }

  it('moves metadata from dc: to dcterms:', async () => {
    let db = await migrated()

    let rows = await db.all(
      `SELECT m.id, m.property, v.text FROM metadata m
         JOIN metadata_values v USING (value_id) ORDER BY m.id, m.property`)

    expect(rows).to.eql([
      { id: 1, property: `${DCT}rights`, text: 'Kept' },
      { id: 1, property: `${DCT}title`, text: 'Old title' },
      { id: 2, property: `${DCT}date`, text: 'New' }
    ])
  })

  it('prefers the dcterms value when both exist', async () => {
    let db = await migrated()
    let rows = await db.all(
      `SELECT v.text FROM metadata m JOIN metadata_values v USING (value_id)
         WHERE m.id = 2`)

    expect(rows).to.eql([{ text: 'New' }])
  })

  it('moves Tropy Generic items to the Dublin Core template', async () => {
    let db = await migrated()

    expect((await db.get('SELECT template FROM subjects WHERE id = 1')).template)
      .to.eql(DUBLIN)
    expect((await db.get('SELECT template FROM subjects WHERE id = 2')).template)
      .to.eql('https://tropy.org/v1/templates/photo')
  })

  it('does not run again on new projects', async () => {
    let { db } = project.current
    let row = await db.get('SELECT number FROM migrations WHERE number = ?', NUMBER)
    expect(row).to.exist
  })
})
