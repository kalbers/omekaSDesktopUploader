import { arch, platform } from 'node:process'
import parse from 'semver/functions/parse.js'
import pkg from '../../package.json' with { type: 'json' }
import { titlecase } from './util.js'

const {
  author,
  version,
  name,
  productName
} = pkg

const v = parse(version)
const isLatest = !(v?.prerelease.length > 0)

export const appId = 'org.omeka.DesktopUpload'

export const channel = (isLatest) ?
  'latest' :
    (v.prerelease[0] === 'beta' ? 'beta' : 'alpha')

export const qualified = {
  appId: (isLatest) ? appId : `${appId}-${titlecase(channel)}`,
  name: (isLatest) ? name : `${name}-${channel}`,
  product: (isLatest) ? productName : `${productName} ${titlecase(channel)}`
}

export const exe = qualified[(platform === 'linux') ? 'name' : 'product']

export {
  author,
  name,
  productName as product,
  version
}
