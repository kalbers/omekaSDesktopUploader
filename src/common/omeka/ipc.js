import { ipcRenderer as ipc } from 'electron'

// A fetch() that makes the request in the main process, where it isn't
// subject to CORS. Only supports what OmekaApi needs. A multipart body is
// described as { fields, files } and files are read from disk over there.
export const ipcFetch = async (url, { method, headers, body, form } = {}) => {
  let { ok, status, text } =
    await ipc.invoke('omeka:fetch', { url, method, headers, body, form })

  return { ok, status, text: async () => text }
}

export const getSettings = () => ipc.invoke('omeka:get')
export const saveSettings = (settings) => ipc.invoke('omeka:set', settings)
