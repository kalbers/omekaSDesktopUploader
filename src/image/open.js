import { Asset } from '../asset/asset.js'
import { FileAsset, readHead } from '../asset/file.js'
import { magic } from '../asset/magic.js'
import { isImageType } from '../asset/mimetypes.js'
import { Image } from './image.js'

// Opens a local file as an Image if it is one, or as a plain FileAsset.
// Remote files (URLs) are always treated as images.
export { isImageType }

export async function openAsset(props, ...args) {
  let asset = new Asset(props)

  if (asset.isRemote)
    return Image.open(props, ...args)

  let head = await readHead(asset.path)

  return isImageType(magic(head, asset.ext)) ?
      Image.open(props, ...args) :
      FileAsset.open(props, ...args)
}

// Re-checks a file already in a project, by the type it was stored with.
export function checkAsset(props, ...args) {
  return isImageType(props.mimetype) ?
      Image.check(props, ...args) :
      FileAsset.check(props, ...args)
}
