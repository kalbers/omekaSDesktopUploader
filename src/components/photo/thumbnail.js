import { useDispatch, useSelector } from 'react-redux'
import { Image } from '../image.js'
import { FileIcon } from './file-icon.js'
import { isFileType } from '../../asset/mimetypes.js'
import { selectCachePrefix } from '../../selectors/project.js'
import { Cache } from '../../common/cache.js'
import { SASS } from '../../constants/index.js'
import { Rotation } from '../../common/iiif.js'
import act from '../../actions/photo.js'

const variant = (size) =>
  size > SASS.ICON.SIZE ? SASS.ICON.MAX : SASS.ICON.SIZE


export function Thumbnail({
  size = SASS.ICON.SIZE,
  ...props
}) {
  let dispatch = useDispatch()
  let cache = useSelector(selectCachePrefix)

  // Files which are not images have no thumbnail, just an icon.
  if (isFileType(props.mimetype)) {
    return (
      <figure
        className="thumbnail file"
        style={{ '--x': 1, '--y': 1 }}
        onClick={props.onClick}
        onContextMenu={props.onContextMenu}
        onDoubleClick={props.onDoubleClick}
        onMouseDown={props.onMouseDown}>
        <FileIcon mimetype={props.mimetype}/>
      </figure>
    )
  }

  let src = Cache.url(cache, variant(size), props)
  let rot = Rotation.fromExifOrientation(props.orientation).add(props)
  let [x, y] = rot.ratio(props)
  let rotation = rot.format('x')

  let style = {
    '--x': x,
    '--y': y,
    'backgroundColor': props.color
  }

  let handleError = () => {
    if (!props.broken) {
      dispatch(act.error(props.id))
    }
  }

  return (
    <figure
      className="thumbnail"
      style={style}
      onClick={props.onClick}
      onContextMenu={props.onContextMenu}
      onDoubleClick={props.onDoubleClick}
      onMouseDown={props.onMouseDown}>
      <Image
        src={src}
        rotation={rotation}
        onError={handleError}/>
    </figure>
  )
}

Thumbnail.keys = [
  'angle',
  'broken',
  'color',
  'consolidated',
  'height',
  'id',
  'mimetype',
  'mirror',
  'orientation',
  'size',
  'width'
]
