// Omeka S REST API client. Derived from tropy-plugin-omeka (AGPL-3.0),
// Center for History and New Media, George Mason University.

const PER_PAGE = 100
const MAX_PAGES = 100

// Conversion rules applied to Tropy property URIs before looking them up
// in Omeka (Omeka ships dcterms, not dc elements, as its default).
export const DEFAULT_CONVERT = {
  'http://purl.org/dc/elements/1.1/': 'http://purl.org/dc/terms/'
}

export class OmekaError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'OmekaError'
    this.status = status
    this.body = body
  }

  get isNotFound() {
    return this.status === 404
  }
}

// The base URL should end in "/api", but accept the site URL too.
export const ensureUrl = (url = '') => {
  url = url.trim().replace(/\/+$/, '')
  return url.endsWith('/api') ? url : `${url}/api`
}

const describe = (body) => {
  let errors = body?.errors
  if (!errors) return ''
  if (typeof errors === 'string') return errors
  return Object
    .entries(errors)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('; ')
}

export const parseVocabs = (vocabs = []) =>
  vocabs.reduce((acc, v) => {
    acc[v['o:prefix']] = v['o:namespace_uri']
    return acc
  }, {})

// Maps full property URI => { id, term }
export const parseProps = (vocabs, props = []) =>
  props.reduce((acc, prop) => {
    let term = prop['o:term']
    let [prefix, name] = term.split(':')
    let ns = vocabs[prefix]
    if (ns) acc[ns + name] = { id: prop['o:id'], term }
    return acc
  }, {})

export class OmekaApi {
  constructor({
    url,
    keyIdentity,
    keyCredential,
    userAgent = 'Omeka Desktop Upload'
  }, {
    fetch = globalThis.fetch.bind(globalThis),
    logger
  } = {}) {
    this.url = ensureUrl(url)
    this.keyIdentity = keyIdentity
    this.keyCredential = keyCredential
    this.userAgent = userAgent
    this.fetch = fetch
    this.logger = logger
    this.properties = {}
  }

  get baseUrl() {
    return this.url
  }

  async request(method, path, { qs = {}, json, form } = {}) {
    let params = new URLSearchParams({
      ...qs,
      key_identity: this.keyIdentity,
      key_credential: this.keyCredential
    })

    let init = { method, headers: { 'User-Agent': this.userAgent } }

    if (json !== undefined) {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(json)
    } else if (form) {
      init.body = form
    }

    let res = await this.fetch(`${this.url}${path}?${params}`, init)
    let text = await res.text()
    let body

    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }

    if (!res.ok || body?.errors) {
      throw new OmekaError(
        `${method} ${path} failed (${res.status}) ${describe(body)}`.trim(),
        { status: res.status, body })
    }

    return body
  }

  get = (path, qs) => this.request('GET', path, { qs })
  post = (path, json) => this.request('POST', path, { json })
  patch = (path, json) => this.request('PATCH', path, { json })
  delete = (path) => this.request('DELETE', path)

  async list(path) {
    let all = []
    for (let page = 1; page <= MAX_PAGES; ++page) {
      let res = await this.get(path, { per_page: PER_PAGE, page })
      all.push(...res)
      if (res.length < PER_PAGE) break
    }
    return all
  }

  // Also verifies the URL and keys.
  async connect() {
    let vocabs = parseVocabs(await this.list('/vocabularies'))
    this.properties = parseProps(vocabs, await this.list('/properties'))
    return this.properties
  }

  getResourceTemplates() {
    return this.list('/resource_templates')
  }

  createItem = (data) => this.post('/items', data)
  updateItem = (id, data) => this.patch(`/items/${id}`, data)

  createItemSet = (data) => this.post('/item_sets', data)
  updateItemSet = (id, data) => this.patch(`/item_sets/${id}`, data)

  updateMedia = (id, data) => this.patch(`/media/${id}`, data)
  deleteMedia = (id) => this.delete(`/media/${id}`)

  createHtmlMedia(itemId, html, values = {}) {
    return this.post('/media', {
      'o:ingester': 'html',
      'o:renderer': 'html',
      'o:item': { 'o:id': itemId },
      'html': html,
      ...values
    })
  }

  createFileMedia(itemId, { data, filename, mimetype }, values = {}) {
    let form = new FormData()

    form.append('data', JSON.stringify({
      'o:ingester': 'upload',
      'file_index': 0,
      'o:item': { 'o:id': itemId },
      ...values
    }))
    form.append('file[]', new Blob([data], { type: mimetype }), filename)

    return this.request('POST', '/media', { form })
  }
}
