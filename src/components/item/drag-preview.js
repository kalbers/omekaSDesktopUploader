import cx from 'classnames'
import { CoverImage } from './cover-image.js'

export function ItemDragPreview({ item, size = 64 }) {
  let items = item.items
  let count = items.length

  let { cover, photos } = items[0]

  return (
    <div className={cx('item', 'drag-preview', 'center', {
      multiple: count > 1
    })}>
      <CoverImage
        cover={cover}
        photos={photos}
        size={size}/>
      {count > 1 &&
        <div className="badge">{count}</div>}
    </div>
  )
}
