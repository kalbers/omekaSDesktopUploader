import React from 'react'
import { Toolbar } from '../toolbar.js'
import { ItemToolbar } from './toolbar.js'
import { TabNav, TabPane } from '../tabs.js'
import { NoteList, NoteToolbar } from '../note/index.js'
import { PanelGroup, Panel } from '../panel.js'
import { PhotoPanel, PhotoToolbar } from '../photo/index.js'
import { MetadataPanel } from '../metadata/index.js'
import { IconMetadata } from '../icons.js'
import { isInput } from '../../dom.js'
import { TABS, UI } from '../../constants/index.js'


export class ItemPanelGroup extends React.PureComponent {
  panel = React.createRef()
  tab = React.createRef()

  get toolbar() {
    return (
      <ItemToolbar isItemMode={this.props.isItemMode}/>
    )
  }

  get keymap() {
    return this.props.keymap.ItemPanel
  }

  handleKeyDown = (event) => {
    if (isInput(event.target))
      return

    switch (this.keymap.match(event)) {
      case 'up':
        if (this.props.isReadOnly) return
        this.tab.current?.prev()
        break
      case 'down':
        if (this.props.isReadOnly) return
        this.tab.current?.next()
        break
      default:
        return
    }

    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
  }

  handleNoteOpen = (note) => {
    if (note != null && !this.props.isItemMode) {
      this.props.onItemOpen({
        id: this.props.items[0].id,
        photos: [this.props.photo.id],
        notes: [note.id]
      })
    }
  }

  handlePhotoCreate = (data) => {
    this.props.onPhotoCreate({
      item: this.props.items?.[0]?.id,
      ...data
    })
  }

  handleResize = (slots) => {
    this.props.onUiUpdate({ panel: { slots } })
  }

  handleTabChange = (tab) => {
    this.props.onUiUpdate({ panel: { tab } })
  }

  handleZoomChange = (zoom) => {
    this.props.onUiUpdate({ panel: { zoom } })
  }

  render() {
    let { isDisabled, isReadOnly, photo, panel } = this.props
    let hasMultipleItems = this.props.items.length > 1
    let item = hasMultipleItems ? null : this.props.items[0]

    let isPhotosDisabled =
      isDisabled || isReadOnly || item == null || hasMultipleItems
    let isNotesDisabled = isPhotosDisabled || isReadOnly || photo == null


    return (
      <PanelGroup
        className="item-panel-group"
        header={this.toolbar}
        slots={panel.slots}
        onResize={this.handleResize}>

        <Panel
          className="item-panel"
          ref={this.panel}
          tabIndex={
            isDisabled || this.props.items.length === 0 ? -1 : TABS.ItemPanel
          }
          onKeyDown={this.handleKeyDown}>
          <Toolbar>
            <Toolbar.Left>
              <TabNav
                active={UI.PANEL.METADATA}
                justified
                tabs={this.props.tabs}
                onChange={this.handleTabChange}/>
            </Toolbar.Left>
          </Toolbar>
          <TabPane active={UI.PANEL.METADATA}>
            {(tab, props) => {
              if (this.props.items.length === 0) return null

              switch (tab) {
                case UI.PANEL.METADATA:
                  return (
                    <MetadataPanel
                      {...props}
                      ref={this.tab}
                      isDisabled={isDisabled || isReadOnly}
                      onContextMenu={this.props.onContextMenu}
                      onEdit={this.props.onEdit}
                      onCancel={this.props.onEditCancel}
                      onMetadataSave={this.props.onMetadataSave}
                      onPhotoSave={this.props.onPhotoSave}/>
                  )
              }
            }}
          </TabPane>
        </Panel>

        <Panel className="photo-panel">
          <PhotoToolbar
            hasCreateButton
            isDisabled={isPhotosDisabled}
            photos={this.props.photos.length}
            zoom={panel.zoom}
            onCreate={this.handlePhotoCreate}
            onZoomChange={this.handleZoomChange}/>
          <PhotoPanel
            canCreate
            isDisabled={isPhotosDisabled}
            isItemOpen={this.props.isItemMode}
            photos={this.props.photos}
            zoom={panel.zoom}
            onEdit={this.props.onEdit}
            onEditCancel={this.props.onEditCancel}
            onItemOpen={this.props.onItemOpen}
            onChange={this.props.onMetadataSave}
            onContextMenu={this.props.onContextMenu}
            onCreate={this.handlePhotoCreate}
            onSelect={this.props.onPhotoSelect}/>
        </Panel>

        <Panel className="note-panel">
          <NoteToolbar
            hasCreateButton
            isDisabled={isNotesDisabled}
            notes={this.props.notes.length}/>
          <NoteList
            isReadOnly={isReadOnly}
            notes={this.props.notes}
            selection={this.props.note}
            onRemove={this.props.onNoteDelete}
            onContextMenu={this.props.onContextMenu}
            onOpen={this.handleNoteOpen}
            onSelect={this.props.onNoteSelect}/>
        </Panel>
      </PanelGroup>
    )
  }

  static defaultProps = {
    tabs: [
      {
        name: UI.PANEL.METADATA,
        label: 'panel.metadata.tab',
        icon: <IconMetadata/>
      }
    ]
  }
}
