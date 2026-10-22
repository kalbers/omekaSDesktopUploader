// Only locales with string, menu, and keymap files in res/ belong here.
// To add a translation, add its files and list it below ('zh' style aliases
// are filtered from supportedLanguages).
const LOCALE = {
  en: 'en'
}

export const supportedLanguages =
  Object.keys(LOCALE).sort().filter(lang => lang !== 'zh')

LOCALE.default = 'en'
export default LOCALE
