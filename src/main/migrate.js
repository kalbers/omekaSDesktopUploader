import semver from 'semver'
import { info, warn } from '../common/log.js'

// App-level (not project database) migrations. Each runs once, when the
// saved app state is from a version older than `v` ([major, minor]):
//
//   createMigration('name', [0, 2], async (app, state) => { ... })
//
// Migrations inherited from Tropy (< 1.17) were dropped: this app starts
// at 0.1.0 and has no such installations to upgrade.
const createMigration = (name, v, up) => ({ name, v, up })

export const MIGRATIONS = []

export async function migrate(app, state, version = app.version) {
  for (let m of MIGRATIONS) {
    try {
      if (semver.lt(version, `${m.v[0]}.${m.v[1]}.0`)) {
        info(`migrate ${m.name}`)
        await m.up(app, state)
      }
    } catch (e) {
      warn({ stack: e.stack }, `migration ${m.name} failed`)
    }
  }
}

export { createMigration }
