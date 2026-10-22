import { basename, join, resolve } from 'node:path'
import fs from 'node:fs'
import { homedir } from 'node:os'
import { qualified } from '../common/release.js'
import { spawn } from '../common/spawn.js'
import { ShellOption } from './win-shell.js'

const appFolder = resolve(process.execPath, '..')
const rootAppDir = resolve(appFolder, '..')
const updateDotExe = join(rootAppDir, 'Update.exe')
const exeName = basename(process.execPath)


export function handleSquirrelEvent(type, opts) {
  switch (type) {
    case '--squirrel-install':
      return handleInstall()

    case '--squirrel-updated':
      return handleUpdated()

    case '--squirrel-uninstall':
      return handleUninstall(opts)

    case '--squirrel-obsolete':
      return Promise.resolve()

    case '--squirrel-firstrun':
      return null

    default:
      return null
  }
}

async function handleInstall() {
  await createShortcut(['StartMenu', 'Desktop'])
  await registerApplication()
}

async function handleUpdated() {
  await updateShortcut()
  await registerApplication()
}

async function handleUninstall(opts = {}) {
  await removeShortcut()
  await clearAppRegistration()
  await rm(opts.logs)
  await rm(opts.cache)
  await rm(opts.data)
}

function createShortcut(locations) {
  return spawn(updateDotExe, [
    '--createShortcut',
    exeName,
    '-l',
    locations.join(',')
  ])
}

function updateShortcut() {
  let locations = ['StartMenu', 'Desktop']
  let home = homedir()

  if (home) {
    // TODO single-release use unqualified!
    let desktopShortcut = join(home, 'Desktop', `${qualified.product}.lnk`)

    if (!fs.existsSync(desktopShortcut))
      locations = ['StartMenu']
  }

  return createShortcut(locations)
}

function removeShortcut() {
  return spawn(updateDotExe, ['--removeShortcut', exeName])
}

async function registerApplication() {
  let exe = process.execPath
  await ShellOption
    .forAppPath(exe)
    .register()

}

async function clearAppRegistration() {
  let exe = process.execPath

  await ShellOption.forAppPath(exe).clear()
  await ShellOption.forApplication(exe).clear()
}



async function rm(path) {
  if (path) {
    return fs.promises.rm(path, { recursive: true, maxRetries: 3 })
  }
}
