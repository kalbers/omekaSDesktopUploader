import React from 'react'
import { Scroll } from '../scroll/index.js'
import { PhotoListItem } from './list-item.js'
import { PhotoIterator } from './iterator.js'
import { SASS } from '../../constants/index.js'
import { dc } from '../../ontology/ns.js'
import cx from 'classnames'
import { match } from '../../keymap.js'


class PhotoList extends PhotoIterator {
  get classes() {
    return ['photo-list', super.classes]
  }

  isEditing(photo) {
    return this.props.edit.photo === photo.id
  }

  edit = (photo) => {
    if (photo != null && !this.props.isDisabled) {
      this.props.onEdit({ photo: photo.id })
    }
  }

  handleEditCancel = (...args) => {
    this.props.onEditCancel(...args)
    this.container.current.focus()
  }


  handleKeyDown = (event) => {
    switch (match(this.keymap, event)) {
      case 'edit':
      case 'enter':
        this.edit(this.current)
        break
      case 'open':
        this.handleItemOpen(this.current)
        break
      case 'preview':
        this.preview(this.current)
        break
      case 'rotateLeft':
        this.handleRotate(-90)
        break
      case 'rotateRight':
        this.handleRotate(90)
        break
      case 'delete':
        this.handleDelete(this.current)
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
    const { data, edit, onBlur, onChange } = this.props

    return this.connect(
      <div className={cx(this.classes)}>
        <Scroll
          ref={this.container}
          cursor={this.props.current}
          items={this.props.photos}
          itemHeight={SASS.ROW.HEIGHT}
          tabIndex={this.tabIndex}
          onBlur={onBlur}
          onKeyDown={this.handleKeyDown}
          onSelect={this.handleSelectPhoto}>
          {(photo) => (
            <PhotoListItem
              {...this.getIterableProps(photo)}
              key={photo.id}
              photo={photo}
              data={data}
              edit={edit}
              title={dc.title}
              isEditing={this.isEditing(photo)}
              onChange={onChange}
              onEdit={this.edit}
              onEditCancel={this.handleEditCancel}/>
          )}
        </Scroll>
      </div>
    )
  }

  static defaultProps = {
    ...PhotoIterator.defaultProps,
    edit: {}
  }
}


const PhotoListContainer = PhotoList.asDropTarget()

export {
  PhotoListContainer as PhotoList
}
