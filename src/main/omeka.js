import http from 'node:http'
import https from 'node:https'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { ipcMain as ipc, safeStorage } from 'electron'
import { warn } from '../common/log.js'
import { multipart } from './multipart.js'

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
  // Files are given by path and streamed from disk, never loaded whole.
  async fetch({ url, method = 'GET', headers = {}, body, form }) {
    if (form)
      return this.upload({ url, method, headers, form })

    let init = { method, headers }

    if (body != null)
      init.body = body

    let res = await fetch(url, init)
    return { ok: res.ok, status: res.status, text: await res.text() }
  }

  // Sends a multipart request with node:http(s) because, unlike fetch,
  // it applies backpressure: files of any size use a constant amount of memory.
  async upload({ url, method, headers, form }) {
    let { headers: extra, body } = await multipart(form)
    let { request } = new URL(url).protocol === 'https:' ? https : http

    return new Promise((resolve, reject) => {
      let req = request(url, {
        method,
        headers: { ...headers, ...extra }
      }, (res) => {
        let chunks = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('error', reject)
        res.on('end', () => resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: Buffer.concat(chunks).toString('utf-8')
        }))
      })

      req.on('error', reject)
      pipeline(body, req).catch(reject)
    })
  }

  listen() {
    ipc.handle('omeka:get', () => this.load())
    ipc.handle('omeka:set', (_, settings) => this.save(settings))
    ipc.handle('omeka:fetch', (_, request) => this.fetch(request))
  }
}
