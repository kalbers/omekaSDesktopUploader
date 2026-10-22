import assert from 'node:assert'
import { existsSync } from 'node:fs'
import { chmod, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID as uuid } from 'node:crypto'
import { Database } from './db.js'
import { home, normalize } from './os.js'
import { into, select, update } from './query.js'
import { version } from './release.js'
import { empty } from './util.js'
import { info, warn } from './log.js'
import { PROJECT_EXT, isProjectFile } from './project-ext.js'

export { PROJECT_EXT, isProjectFile }


/*
 * Creates a new project file.
 */
export async function create(path, schema, {
  autoclose = true,
  name = 'Omeka Desktop Upload',
  base = null,
  id = uuid(),
  overwrite = false
} = {}) {
  try {
    assert(isProjectFile(path), `project files must end in .${PROJECT_EXT}`)
    assert(BASES.includes(base), `project base not supported: "${base}"`)

    await checkProjectPath(path, overwrite)
    info(`creating new project at "${path}"`)

    var db = new Database(path, 'w+', {
      max: 1,
      journalMode: 'delete'
    })

    await db.read(schema)
    await db.run(...into('project').insert({
      project_id: id,
      name,
      base
    }))

    if (autoclose) {
      await db.close()
      db = null
    }

    return db

  } catch (e) {
    await db?.close()
    throw e
  }
}

// Ensures that a project path is available
async function checkProjectPath(path, overwrite = false) {
  if (existsSync(path)) {
    if (!overwrite)
      throw new Error(`project file exists: "${path}"`)

    warn(`trashing old project previously at "${path}"`)
    await moveToTrash(path)
  }
}


/*
 * Opens a project file and returns an array `[db, project]`
 * with a live `db` instance and the project info object.
 *
 * Unless for read-only project files, any outstanding migrations
 * in the `migrate` folder will be applied.
 *
 * If there are no migrations,
 * an integrity check will be performed instead.
 *
 * Additionally, the following database event handlers are attached:
 * - After the first write (or immediately after migrations)
 *   an access row will be created using the given `user` id.
 *
 * - Before closing the database, the access record will be finalized
 *   and the access table pruned.
 *
 */
export async function open(path, {
  migrate,
  pruneAccessTable = false,
  skipIntegrityCheck = false,
  user,
  ...dbOptions
} = {}) {
  let db = await Database.open(path, {
    journalMode: 'delete',
    ...dbOptions
  })

  if (migrate && !db.isReadOnly) {
    var migrations = await db.migrate(migrate)
    await optimize(db)
  }

  let project = await load(db)
  let accessId

  if (migrations?.length > 0) {
    accessId = await beginProjectAccess(db, user)

  } else {
    db.once('update', async () => {
      accessId = await beginProjectAccess(db, user)
    })

    if (!skipIntegrityCheck) {
      await db.check().catch(() => {
        project.isCorrupted = true
      })
    }
  }

  db.once('will-close', async () => {
    if (accessId)
      await endProjectAccess(db, accessId, pruneAccessTable)
  })

  return [db, project]
}

/*
 * Returns stats for a project file.
 */
export async function pstat(path, modifiedSince) {
  try {
    let { mtimeMs } = await stat(path)

    if (modifiedSince > mtimeMs)
      return null

    var db = new Database(path, 'r', { max: 1 })
    let stats = await db.get(projectStats.query)

    stats.path = path
    stats.lastModified = mtimeMs

    return stats

  } finally {
    await db?.close()
  }
}


export async function load(db) {
  let project = await db.get(projectInfo.query)
  assert(project?.id != null, 'invalid project info')

  project.isReadOnly = db.isReadOnly
  project.basePath = resolveBasePath(db, project.base)

  project.path = db.path

  return project
}

export async function save(db, { id, ...props }) {
  if (!empty(props))
    return db.run(
      ...update('project').set(props).where({ project_id: id })
    )
}

export async function lock(dbFile) {
  return chmod(dbFile, 0o444)
}

export async function unlock(dbFile) {
  return chmod(dbFile, 0o666)
}

export async function getAssets(db, { basePath }) {
  let assets = []

  await db.each(assetInfo.query, asset => {
    asset.path = (
      (basePath && asset.protocol === 'file') ?
          resolve(basePath, normalize(asset.path)) : asset.path
    ).normalize()

    assets.push(asset)
  })

  return assets
}

export async function optimize(db) {
  await db.exec("INSERT INTO fts_notes(fts_notes) VALUES ('optimize')")
  await db.exec("INSERT INTO fts_metadata(fts_metadata) VALUES ('optimize')")
  await db.exec('VACUUM')
}

export async function reindex(db) {
  await db.check()
  await db.exec('REINDEX')
  await db.exec("INSERT INTO fts_notes(fts_notes) VALUES ('rebuild')")
  await db.exec("INSERT INTO fts_metadata(fts_metadata) VALUES ('rebuild')")
}


export function resolveBasePath(db, base) {
  switch (base) {
    case BASE.PROJECT:
      return dirname(db.path)
    case BASE.HOME:
      return home
    default:
      return base
  }
}

const BASE = {
  PROJECT: 'project',
  HOME: 'home'
}

export const BASES = [null, BASE.PROJECT, BASE.HOME]

const projectInfo =
  select({ id: 'project_id' }, 'name', 'base', {
    lastAccess:
      select('opened')
        .from('access')
        .order('opened desc')
        .limit(1)
  }).from('project').limit(1)

const projectStats =
  select({ id: 'project_id' }, 'name', {
    items:
      select('count(id)')
        .from('items')
        .outer.join('trash', { using: 'id' }),
    photos:
      select('count(id)')
        .from('photos')
        .outer.join('trash', { using: 'id' }),
    notes: select('count(note_id)').from('notes')

  }).from('project').limit(1)

const assetInfo =
  select('id', 'protocol', 'path', 'checksum')
    .from('photos')
    .order('protocol, path')

export async function beginProjectAccess(db, user) {
  if (user == null)
    return null

  let { id } = await db.run(
    ...into('access')
      .insert({
        path: db.path,
        uuid: user,
        version
      }))

  return id
}

export async function endProjectAccess(db, id, prune = false) {
  await db.run(
    ...update('access')
      .set('closed = datetime("now")')
      .where({ rowid: id }))

  if (prune) {
    await db.run(`
      DELETE FROM access
        WHERE rowid <= (
          SELECT rowid FROM (
            SELECT rowid FROM access ORDER BY rowid DESC LIMIT 1 OFFSET 99
          )
        )`
    )
  }
}

// NB delaying the electron import here on purpose
// so that we can load the utilities from Node.js scripts
async function moveToTrash(path) {
  const { shell } = await import('electron')
  await shell.trashItem(path)
}
