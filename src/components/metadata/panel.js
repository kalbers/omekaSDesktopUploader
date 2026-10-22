import React from 'react'
import { connect } from 'react-redux'
import { MetadataList } from './list.js'
import { MetadataSection } from './section.js'
import { ScrollContainer } from '../scroll/container.js'
import { PhotoInfo } from '../photo/info.js'
import { ItemInfo } from '../item/info.js'
import * as act from '../../actions/index.js'

import {
  getItemFields,
  getPhotoFields,
  getSelectedItemTemplate,
  getSelectedItems,
  getSelectedPhoto
} from '../../selectors/index.js'


class MetadataPanel extends React.PureComponent {
  fields = [null, null]

  get isEmpty() {
    return this.props.items.length === 0
  }

  get isBulk() {
    return this.props.items.length > 1
  }

  get hasPhotoFields() {
    return this.props.photo != null && !this.props.photo.pending
  }

  next = (i = 0) => {
    for (let ii = i + 2; i < ii; ++i) {
      let fields = this.fields[i % 2]
      let next = (fields != null) && fields.next()
      if (next) return fields.edit(next.property.id)
    }
  }

  prev = (i = 1) => {
    for (let ii = i - 1; i >= ii; --i) {
      let fields = this.fields[i % 2]
      let prev = (fields != null) && fields.prev()
      if (prev) return fields.edit(prev.property.id)
    }
  }

  setItemFields = (item) => {
    this.fields[0] = item
  }

  setPhotoFields = (photo) => {
    this.fields[1] = photo
  }

  handleAfterItemFields = () => {
    this.next(1)
  }

  handleBeforeItemFields = () => {
    this.prev(1)
  }

  handleAfterPhotoFields = () => {
    this.next(0)
  }

  handleBeforePhotoFields = () => {
    this.prev(0)
  }

  handleItemTemplateChange = (template, hasChanged) => {
    if (hasChanged || this.isBulk) {
      this.props.onTemplateChange('item', {
        id: this.props.items.map(it => it.id),
        template: template.id
      })
    }
  }

  handlePhotoTemplateChange = (template, hasChanged) => {
    if (hasChanged) {
      this.props.onTemplateChange('photo', {
        id: [this.props.photo.id],
        template: template.id
      })
    }
  }

  handleItemContextMenu = (event, data = {}) => {
    this.handleContextMenu(event, { ...data, type: 'item' })
  }

  handlePhotoContextMenu = (event, data = {}) => {
    this.handleContextMenu(event, { ...data, type: 'photo' })
  }

  handleContextMenu(event, data = {}) {
    if (!this.props.isDisabled) {
      let id = (data.type === 'item')
        ? this.props.items.map(it => it.id)
        : [this.props?.[data.type]?.id]

      let context = data.property ?
        'metadata-field' : 'metadata-list'

      this.props.onContextMenu(event, context, { ...data, id })
    }
  }

  renderItemFields() {
    return !this.isEmpty && (
      <MetadataSection
        count={this.props.items.length}
        isDisabled={this.props.isDisabled}
        isMixed={this.props.template.mixed}
        template={this.props.template.id}
        title="panel.metadata.item"
        onTemplateChange={this.handleItemTemplateChange}
        onContextMenu={this.handleItemContextMenu}>
        <MetadataList
          ref={this.setItemFields}
          edit={this.props.edit}
          fields={this.props.fields.item}
          isDisabled={this.props.isDisabled}
          onEdit={this.props.onEdit}
          onCancel={this.props.onCancel}
          onContextMenu={this.handleItemContextMenu}
          onChange={this.props.onMetadataSave}
          onAfter={this.handleAfterItemFields}
          onBefore={this.handleBeforeItemFields}
          onCreate={this.props.onMetadataAdd}/>
        {!this.isBulk &&
          <ItemInfo item={this.props.items[0]}/>}
      </MetadataSection>
    )
  }

  renderPhotoFields() {
    return this.hasPhotoFields && (
      <MetadataSection
        isDisabled={this.props.isDisabled}
        template={this.props.photo.template}
        title="panel.metadata.photo"
        onTemplateChange={this.handlePhotoTemplateChange}
        onContextMenu={this.handlePhotoContextMenu}>
        <MetadataList
          ref={this.setPhotoFields}
          edit={this.props.edit}
          fields={this.props.fields.photo}
          isDisabled={this.props.isDisabled}
          onEdit={this.props.onEdit}
          onCancel={this.props.onCancel}
          onContextMenu={this.handlePhotoContextMenu}
          onChange={this.props.onMetadataSave}
          onAfter={this.handleAfterPhotoFields}
          onBefore={this.handleBeforePhotoFields}
          onCreate={this.props.onMetadataAdd}/>
        <PhotoInfo
          photo={this.props.photo}
          isDisabled={this.props.isDisabled}/>
      </MetadataSection>
    )
  }

  render() {
    return (
      <ScrollContainer>
        {this.renderItemFields()}
        {this.renderPhotoFields()}
      </ScrollContainer>
    )
  }
}

const MetadataPanelContainer = connect(
  (state) => ({
    edit: state.edit.field,
    fields: {
      item: getItemFields(state),
      photo: getPhotoFields(state)
    },
    items: getSelectedItems(state),
    photo: getSelectedPhoto(state),
    template: getSelectedItemTemplate(state)
  }),

  (dispatch) => ({
    onMetadataAdd(...args) {
      dispatch(act.metadata.add(...args))
    },

    onTemplateChange(type, ...args) {
      dispatch(act[type].template.change(...args))
    }
  }), null, { forwardRef: true }
)(MetadataPanel)

export {
  MetadataPanelContainer as MetadataPanel
}
