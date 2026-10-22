import process from 'node:process'
import semver from 'semver'
import shx from 'shelljs'

const VERSION = process.env.npm_package_version

const METAINFO = 'res/linux/org.omeka.DesktopUpload.metainfo.xml'
const RELEASES = '  <releases>'

function datestring(date = new Date) {
  return date.toISOString().slice(0, 10)
}

if (!semver.valid(VERSION)) {
  console.error('no valid npm version given')
  process.exit(1)
}

if (!semver.prerelease(VERSION)) {
  const release = [
    `    <release version="${VERSION}" date="${datestring()}">`,
    '    </release>'
  ]
  shx.sed('-i', RELEASES, [RELEASES, ...release].join('\n'), METAINFO)
}
