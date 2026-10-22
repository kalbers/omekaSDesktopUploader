// Files which are never worth adding: operating-system bookkeeping,
// hidden files, and the temporary files other programs leave while saving
// or downloading.
const NAMES = new Set(['thumbs.db', 'desktop.ini', 'ehthumbs.db'])
const PATTERNS = [/^\./, /^~\$/, /~$/, /\.(tmp|part|partial|crdownload|download)$/i]

export const isIgnoredFile = (name = '') => {
  let lower = name.toLowerCase()
  return NAMES.has(lower) || PATTERNS.some(pattern => pattern.test(lower))
}
