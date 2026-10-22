import React from 'react'
import { PhotoIterator } from './iterator.js'
import { PhotoTile } from './tile.js'
import { Scroll } from '../scroll/scroll.js'
import cx from 'classnames'
import { match } from '../../keymap.js'
import { SASS } from '../../constants/index.js'


class PhotoGrid extends PhotoIterator {
  handleKeyDown = (event) => {
    switch (match(this.keymap, event)) {
      case 'open':
        this.handleItemOpen(this.current)
        break
      case 'preview':
        this.preview(this.current)
        break
      case 'delete':
        this.handleDelete(this.current)
        break
      case 'rotateLeft':
        this.handleRotate(-90)
        break
      case 'rotateRight':
        this.handleRotate(90)
        break
      case 'copyPhoto':
        this.handleExtract(this.current, { target: ':clipboard:' })
        break
      case 'extract':
        this.handleExtract(this.current)
        break
      default:
        return
    }

    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  render() {
    let tileSize = Math.round(this.props.size * SASS.TILE.FACTOR)

    return this.connect(
      <div
        className={cx('photo-grid', this.classes)}
        data-size={this.props.size}>
        <Scroll
          ref={this.container}
          cursor={this.props.current}
          items={this.props.photos}
          itemHeight={tileSize}
          itemWidth={tileSize}
          tabIndex={this.tabIndex}
          onBlur={this.props.onBlur}
          onKeyDown={this.handleKeyDown}
          onSelect={this.handleSelectPhoto}>
          {(photo, index) => (
            <PhotoTile
              {...this.getIterableProps(photo)}
              key={photo.id}
              photo={photo}
              isLast={index >= this.props.photos.length - 1}/>
          )}
        </Scroll>
      </div>
    )
  }
}

const PhotoGridContainer = PhotoGrid.asDropTarget()

export {
  PhotoGridContainer as PhotoGrid
}
