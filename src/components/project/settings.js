import React from 'react'
import { Form, FormField, FormToggle, FormToggleGroup } from '../form.js'
import { BASES } from '../../common/project.js'


export const ProjectSettings = React.memo(({
  baseOptions = BASES,
  project,
  onChange
}) => (
  <Form>
    <FormField
      id="prefs.project.name"
      name="name"
      isCompact
      isReadOnly={project.isReadOnly}
      isRequired
      tabIndex={0}
      value={project.name}
      onChange={onChange}/>
    <FormField
      id="prefs.project.id"
      name="id"
      isCompact
      isReadOnly
      value={project.id}/>
    <FormField
      id="prefs.project.path"
      name="path"
      isCompact
      isReadOnly
      value={project.path}/>
    <hr/>

    <FormToggleGroup
      id="prefs.project.base"
      name="base"
      isReadOnly={project.isReadOnly}
      default="none"
      value={project.base}
      options={baseOptions}
      tabIndex={0}
      onChange={onChange}/>
    <hr/>

    <FormField
      id="prefs.project.watch.folder"
      name="watch.folder"
      isCompact
      tabIndex={0}
      type="directory"
      value={project.watch.folder}
      onChange={onChange}/>
    <FormToggle
      id="prefs.project.watch.usePolling"
      isDisabled={!project.watch.folder}
      name="watch.usePolling"
      value={!!project.watch.usePolling}
      onChange={onChange}/>
  </Form>
))
