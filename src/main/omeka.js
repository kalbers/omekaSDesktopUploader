import { join } from 'node:path'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { ipcMain as ipc, safeStorage } from 'electron'
import { warn } from '../common/log.js'

const DEFAULTS = {
  url: '',
  keyIdentity: '',
  keyCredential: '',
  template: ''
}

/**
 * Global Omeka S connection settings. The credential key is encrypted with
 * the operating system's keychain when available (Electron safeStorage).
 *
 * All Omeka HTTP requests are made from here (Node's fetch) rather than from
 * the renderer, which would be subject to the browser's CORS restrictions.
 */
export class OmekaSettings {
  constructor(dir) {
    this.file = join(dir, 'omeka.json')
  }

  get isEncrypted() {
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  async load() {
    try {
      let { keyCredential, encrypted, ...rest } =
        JSON.parse(await readFile(this.file, 'utf-8'))

      let credential = ''

      if (keyCredential) {
        credential = encrypted ?
            safeStorage.decryptString(Buffer.from(keyCredential, 'base64')) :
          keyCredential
      }

      return {
        ...DEFAULTS,
        ...rest,
        keyCredential: credential,
        isEncrypted: this.isEncrypted
      }

    } catch (e) {
      if (e.code !== 'ENOENT')
        warn({ stack: e.stack }, 'failed to load omeka settings')

      return { ...DEFAULTS, isEncrypted: this.isEncrypted }
    }
  }

  async save(settings) {
    let { url, keyIdentity, keyCredential, template } = {
      ...DEFAULTS,
      ...settings
    }

    let encrypted = !!keyCredential && this.isEncrypted

    let data = {
      url: url.trim(),
      keyIdentity: keyIdentity.trim(),
      template: String(template ?? '').trim(),
      encrypted,
      keyCredential: !keyCredential ? '' : (encrypted ?
          safeStorage.encryptString(keyCredential).toString('base64') :
        keyCredential)
    }

    await mkdir(join(this.file, '..'), { recursive: true })
    await writeFile(this.file, JSON.stringify(data, null, 2), { mode: 0o600 })
    await chmod(this.file, 0o600)

    return this.load()
  }

  // Performs a request on behalf of a renderer. Multipart bodies arrive as
  // { form: { fields, files } } because FormData can't cross the IPC boundary.
  async fetch({ url, method = 'GET', headers = {}, body, form }) {
    let init = { method, headers }

    if (form) {
      let data = new FormData()

      for (let [name, value] of form.fields)
        data.append(name, value)

      for (let { name, filename, mimetype, data: bytes } of form.files)
        data.append(name, new Blob([bytes], { type: mimetype }), filename)

      init.body = data

    } else if (body != null) {
      init.body = body
    }

    let res = await fetch(url, init)
    return { ok: res.ok, status: res.status, text: await res.text() }
  }

  listen() {
    ipc.handle('omeka:get', () => this.load())
    ipc.handle('omeka:set', (_, settings) => this.save(settings))
    ipc.handle('omeka:fetch', (_, request) => this.fetch(request))
  }
}
