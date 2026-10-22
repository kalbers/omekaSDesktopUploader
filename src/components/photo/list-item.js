import React from 'react'
import { Editable } from '../editable.js'
import { createClickHandler } from '../util.js'
import { PhotoIterable } from './iterable.js'
import { TYPE } from '../../constants/index.js'
import cx from 'classnames'
import { testFocusChange } from '../../dom.js'
import { Icon } from '../icons.js'
import { Button } from '../button.js'


class PhotoListItem extends PhotoIterable {
  get classes() {
    return [...super.classes, { active: this.isActive }]
  }

  get isDraggable() {
    return !this.props.isEditing && super.isDraggable
  }

  get title() {
    let { data, photo, title } = this.props
    return data?.[photo.id]?.[title]?.text
  }

  handleMouseDown = () => {
    this.hasFocusChanged = testFocusChange()
  }

  handleSingleClick = () => {
    if (!(this.props.isDisabled || this.props.isDragging)) {
      this.props.onEdit(this.props.photo)
    }
  }

  handleClick = createClickHandler({
    onClick: () => {
      let { isActive } = this
      this.select()
      return !isActive || this.hasFocusChanged()
    },

    onSingleClick: this.handleSingleClick,

    onDoubleClick: () => {
      if (!this.props.isItemOpen) {
        this.props.onItemOpen(this.props.photo)
      } else {
        this.handleSingleClick()
      }
    }
  })


  handleChange = (text) => {
    const { photo, title, onChange, onEditCancel } = this.props

    onChange({
      id: photo.id,
      data: {
        [title]: { text, type: TYPE.TEXT }
      }
    })

    onEditCancel()
  }

  render() {
    const {
      isDisabled,
      isEditing,
      onEditCancel,
      photo
    } = this.props

    return this.connect(
      <li
        className={cx(this.classes)}
        ref={this.container}>
        <div
          className="photo-container"
          onClick={this.handleClick}
          onContextMenu={this.handleContextMenu}
          onMouseDown={this.handleMouseDown}>
          <div className="thumbnail-container">
            {this.renderThumbnail()}
          </div>
          <div className="title">
            <Editable
              value={this.title}
              resize
              isActive={isEditing}
              isDisabled={isDisabled}
              onCancel={onEditCancel}
              onChange={this.handleChange}/>
          </div>
          <div className="icon-container">
            {photo.broken && (
              <Button
                icon={<Icon name="Warning"/>}
                title="photo.consolidate"
                onClick={this.handleConsolidate}/>
            )}
          </div>
        </div>
      </li>
    )
  }
}


const PhotoListItemContainer = PhotoListItem.wrap()

export {
  PhotoListItemContainer as PhotoListItem
}
