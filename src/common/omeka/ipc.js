import { ipcRenderer as ipc } from 'electron'

const flatten = async (form) => {
  let fields = []
  let files = []

  for (let [name, value] of form.entries()) {
    if (typeof value === 'string')
      fields.push([name, value])
    else
      files.push({
        name,
        filename: value.name,
        mimetype: value.type,
        data: new Uint8Array(await value.arrayBuffer())
      })
  }

  return { fields, files }
}

// A fetch() that makes the request in the main process, where it isn't
// subject to CORS. Only supports what OmekaApi needs.
export const ipcFetch = async (url, { method, headers, body } = {}) => {
  let request = { url, method, headers }

  if (body instanceof FormData)
    request.form = await flatten(body)
  else
    request.body = body

  let { ok, status, text } = await ipc.invoke('omeka:fetch', request)
  return { ok, status, text: async () => text }
}

export const getSettings = () => ipc.invoke('omeka:get')
export const saveSettings = (settings) => ipc.invoke('omeka:set', settings)
