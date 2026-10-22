import { FormSelect } from '../form.js'
import { useIpcEvent } from '../../hooks/use-ipc.js'
import { useWindowArgs } from '../../hooks/use-window.js'
import { supportedLanguages } from '../../constants/locale.js'

export function LocaleSettings({ options = supportedLanguages }) {
  let { locale } = useWindowArgs()

  let handleLocaleChange = useIpcEvent(event => (
    event.locale
  ), ['cmd', 'app:switch-locale'])

  // Nothing to choose from until translations are added.
  if (options.length < 2) return null

  return (
    <FormSelect
      id="prefs.app.locale.locale"
      name="locale"
      isRequired
      isSelectionHidden
      value={locale}
      options={options}
      tabIndex={0}
      onChange={handleLocaleChange}/>
  )
}
