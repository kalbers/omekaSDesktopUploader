import { useEffect, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Button } from '../button.js'
import { FormElement, FormGroup } from '../form.js'
import { useEvent } from '../../hooks/use-event.js'
import { OmekaApi } from '../../common/omeka/index.js'
import {
  getSettings,
  ipcFetch,
  saveSettings
} from '../../common/omeka/ipc.js'

const templateLabel = (t) => `${t['o:label']} (#${t['o:id']})`

export function OmekaSettings() {
  let intl = useIntl()
  let [form, setForm] = useState(null)
  let [templates, setTemplates] = useState([])
  let [status, setStatus] = useState(null)
  let [isDirty, setDirty] = useState(false)

  useEffect(() => {
    getSettings().then(setForm)
  }, [])

  let handleChange = useEvent(({ target }) => {
    setForm(f => ({ ...f, [target.name]: target.value }))
    setDirty(true)
    setStatus(null)
  })

  let handleSave = useEvent(async () => {
    setForm(await saveSettings(form))
    setDirty(false)
    setStatus({ type: 'ok', id: 'prefs.omeka.saved' })
  })

  let handleTest = useEvent(async () => {
    setStatus({ type: 'busy', id: 'prefs.omeka.testing' })

    try {
      let api = new OmekaApi(form, { fetch: ipcFetch })
      let props = await api.connect()
      setTemplates(await api.getResourceTemplates())
      setStatus({
        type: 'ok',
        id: 'prefs.omeka.connected',
        values: { count: Object.keys(props).length }
      })
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
    }
  })

  if (!form) return null

  let options = templates.map(t => ({ id: String(t['o:id']), label: templateLabel(t) }))

  if (form.template && !options.some(o => o.id === String(form.template)))
    options.unshift({ id: String(form.template), label: `#${form.template}` })

  let canTest = !!(form.url && form.keyIdentity && form.keyCredential)

  return (
    <div className="omeka-settings">
      <FormElement id="prefs.omeka.url" description="prefs.omeka.urlHint">
        <input
          className="form-control"
          name="url"
          placeholder="https://example.org/s/site"
          type="text"
          value={form.url}
          onChange={handleChange}/>
      </FormElement>
      <FormElement id="prefs.omeka.keyIdentity">
        <input
          className="form-control"
          name="keyIdentity"
          type="text"
          value={form.keyIdentity}
          onChange={handleChange}/>
      </FormElement>
      <FormElement
        id="prefs.omeka.keyCredential"
        description={form.isEncrypted ?
          'prefs.omeka.encrypted' : 'prefs.omeka.unencrypted'}>
        <input
          autoComplete="off"
          className="form-control"
          name="keyCredential"
          type="password"
          value={form.keyCredential}
          onChange={handleChange}/>
      </FormElement>
      <FormElement id="prefs.omeka.template" description="prefs.omeka.templateHint">
        <select
          className="form-control"
          name="template"
          value={form.template}
          onChange={handleChange}>
          <option value="">
            {intl.formatMessage({ id: 'prefs.omeka.templateNone' })}
          </option>
          {options.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </FormElement>
      <FormGroup>
        <div className="col-8 col-offset-4">
          <Button
            isDefault
            isDisabled={!canTest}
            text="prefs.omeka.test"
            onClick={handleTest}/>
          {' '}
          <Button
            isPrimary
            isDisabled={!isDirty}
            text="prefs.omeka.save"
            onClick={handleSave}/>
          {status && (
            <p className={`omeka-status ${status.type}`}>
              {status.id ?
                  <FormattedMessage id={status.id} values={status.values}/> :
                status.message}
            </p>
          )}
        </div>
      </FormGroup>
    </div>
  )
}
