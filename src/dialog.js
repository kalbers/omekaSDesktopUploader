import assert from 'node:assert'
import { dirname } from 'node:path'
import { ipcRenderer as ipc, clipboard } from 'electron'
import ARGS from './args.js'
import { counter, get } from './common/util.js'
import { crashReport, warn } from './common/log.js'
import { PROJECT_EXT } from './common/project-ext.js'
import IMAGE from './constants/image.js'

let seq
let pending
let STORE

function t(...args) {
  return get(STORE.getState(), ['intl', 'messages', ...args])
}

function start(store) {
  assert(seq == null, 'already initialized')

  seq = counter()
  pending = {}
  STORE = store

  ipc.on('dialog', onClosed)
}

function stop() {
  ipc.removeListener('dialog', onClosed)
  seq = null
  pending = null
}

function onClosed(_, { id, payload, error }) {
  try {
    pending[id][error ? 'reject' : 'resolve'](payload)
  } catch (error) {
    warn(`failed to resolve dialog #${id}: ${error.message}`)
  } finally {
    delete pending[id]
  }
}

function show(type, options = {}) {
  return new Promise((resolve, reject) => {
    let id = seq.next().value
    ipc.send('wm', 'dialog', { id, type, options })
    pending[id] = { resolve, reject }
  })
}

function notify(id, opts) {
  return show('message-box', {
    type: 'info',
    ...t('dialog', 'notify', ...id.split('.')),
    ...opts
  })
}

function fail(e, code = e.code, detail) {
  let message = t(`error.${code}`) || e.message

  return show('message-box', {
    type: 'error',
    ...t('dialog', 'error'),
    message,
    detail: detail || e.stack
  }).then(({ response }) => {
    switch (response) {
      case 1:
        clipboard.write({ text: crashReport(e, message) })
        break
      case 2:
        ipc.send('shell', 'show', ARGS.log)
        break
    }
  })
}

async function prompt(id, {
  defaultId = 0,
  cancelId = 0,
  isChecked = false,
  ...opts
} = {}) {
  let { response, checked } = await show('message-box', {
    ...t('dialog', 'prompt', ...id.split('.')),
    type: 'question',
    defaultId,
    cancelId,
    checkboxChecked: isChecked,
    ...opts
  })

  return {
    ok: response !== cancelId,
    cancel: response === cancelId,
    isChecked: checked
  }
}

function save(opts) {
  return show('save', opts)
}

function open(opts) {
  return show('file', opts)
}

open.images = (opts) => open({
  filters: [{
    name: t('dialog', 'filter', 'images'),
    extensions: IMAGE.EXT
  }],
  properties: ['openFile', 'multiSelections'],
  ...opts
})

open.image = (opts) => open.images({
  properties: ['openFile'],
  ...opts
})

open.dir = (opts) => open({
  properties: ['openDirectory', 'multiSelections'],
  ...opts
})

open.project = (path) => {
  let defaultPath

  if (path)
    defaultPath = dirname(path)

  return open({
    filters: [
      {
        name: t('dialog', 'filter', 'projects'),
        extensions: [PROJECT_EXT]
      }
    ],
    defaultPath,
    properties: ['openFile']
  })
}

open.vocab = (opts) => open({
  filters: [{
    name: t('dialog', 'filter', 'rdf'),
    extensions: ['n3', 'ttl']
  }],
  properties: ['openFile', 'multiSelections'],
  ...opts
})

open.templates = (opts) => open({
  filters: [{
    name: t('dialog', 'filter', 'templates'),
    extensions: ['ttp']
  }],
  properties: ['openFile', 'multiSelections'],
  ...opts
})


save.project = (name = 'Project', opts = {}) => save({
  filters: [{
    name: t('dialog', 'filter', 'projects'),
    extensions: [PROJECT_EXT]
  }],
  properties: [
    'createDirectory',
    'showOverwriteConfirmation'
  ],
  defaultPath: `${name}.${PROJECT_EXT}`,
  ...opts
})

save.tpm = (opts) => save({
  filters: [{
    name: t('dialog', 'filter', 'projects'),
    extensions: ['tpm']
  }],
  properties: [
    'createDirectory',
    'showOverwriteConfirmation'
  ],
  ...opts
})

save.csv = (opts) => save({
  filters: [{
    name: t('dialog', 'filter', 'csv'),
    extensions: ['csv']
  }],
  ...opts
})

save.template = (opts) => save({
  filters: [{
    name: t('dialog', 'filter', 'templates'),
    extensions: ['ttp']
  }],
  ...opts
})

save.image = (opts) => save({
  filters: [{
    name: t('dialog', 'filter', 'images'),
    extensions: ['jpg', 'jpeg', 'png', 'webp']
  }],
  ...opts
})

save.vocab = (opts) => save({
  filters: [{
    name: t('dialog', 'filter', 'rdf'),
    extensions: ['n3']
  }],
  ...opts
})


export {
  fail,
  notify,
  open,
  prompt,
  save,
  show,
  start,
  stop
}
