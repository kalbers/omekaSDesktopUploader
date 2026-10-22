import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { FormattedMessage } from 'react-intl'
import { useEvent } from '../../hooks/use-event.js'
import { Titlebar } from '../toolbar.js'
import { Button } from '../button.js'
import { FormElement } from '../form.js'
import { create } from '../../slices/project-files.js'


export const NewProject = ({
  onCreated
}) => {
  let dispatch = useDispatch()

  let [name, setName] = useState('')

  let handleProjectCreate = useEvent((event) => {
    event.preventDefault()

    dispatch(create({ name }))
      .then(action => {
        if (action?.payload?.path)
          onCreated?.(action.payload.path)
      })
  })

  let handleNameChange = useEvent(e => {
    setName(e.target.value)
  })

  return (
    <div className="new-project">
      <Titlebar isOptional/>
      <figure/>
      <p className="edition">
        <FormattedMessage id="project.new.edition"/>
      </p>
      <h1><FormattedMessage id="project.new.title"/></h1>
      <form onSubmit={handleProjectCreate}>
        <h2><FormattedMessage id="project.new.name"/></h2>
        <FormElement>
          <input
            autoFocus
            className="form-control input-lg"
            onChange={handleNameChange}
            type="text"
            value={name}/>
        </FormElement>
        <Button
          isBlock
          isDisabled={!name}
          isPrimary
          size="xl"
          tabIndex="0"
          text="project.new.create"
          type="submit"/>
      </form>
    </div>
  )
}
