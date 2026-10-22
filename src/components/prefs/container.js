import React, { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Prefs, Body, Header } from './index.js'
import { Nav, NavItem } from './nav.js'
import { TemplateEditor } from '../template/editor.js'
import { VocabBrowser } from '../vocab/browser.js'
import { Pane, Footer } from './pane.js'
import { AppSettings } from '../settings/app.js'
import { ProjectSettings } from '../project/settings.js'
import { OmekaSettings } from '../settings/omeka.js'
import { useIpcSend } from '../../hooks/use-ipc.js'
import * as act from '../../actions/index.js'
import { Button } from '../button.js'
import { IconPlus } from '../icons.js'
import { FormattedMessage } from 'react-intl'
import { Titlebar, Toolbar } from '../toolbar.js'


export function PrefsContainer() {
  let dispatch = useDispatch()

  let project = useSelector(state => state.project)
  let handleProjectChange = useCallback((...args) => {
    dispatch(act.project.save(...args))
  }, [dispatch])

  let handleVocabImport = useCallback(() => {
    dispatch(act.ontology.import())
  }, [dispatch])

  let handleContextMenu = useCallback((event) => {
    event.stopPropagation()
    dispatch(act.context.show(event))
  }, [dispatch])

  let handleOpenLink = useIpcSend(['shell', 'open'])

  return (
    <Prefs onContextMenu={handleContextMenu}>
      <Titlebar isOptional>
        <Toolbar.Center>
          <FormattedMessage id="prefs.title"/>
        </Toolbar.Center>
      </Titlebar>
      <div className="prefs-view">
        <Header>
          <Nav>
            <NavItem name="app" icon="Gear"/>
            <NavItem name="project" icon="Maze" isDisabled={!project?.id}/>
            <NavItem name="template" icon="Document"/>
            <NavItem name="vocab" icon="Book"/>
            <NavItem name="omeka" icon="Plugin"/>
          </Nav>
        </Header>
        <Body>
          <Pane name="app">
            <AppSettings/>
          </Pane>
          <Pane name="project" isDisabled={!project?.id}>
            <ProjectSettings
              project={project}
              onChange={handleProjectChange}/>
          </Pane>
          <Pane name="template">
            <TemplateEditor/>
          </Pane>
          <Pane name="vocab">
            <VocabBrowser
              onOpenLink={handleOpenLink}/>
            <Footer>
              <Button
                icon={<IconPlus/>}
                onClick={handleVocabImport}/>
            </Footer>
          </Pane>
          <Pane name="omeka">
            <OmekaSettings/>
          </Pane>
        </Body>
      </div>
    </Prefs>
  )
}
