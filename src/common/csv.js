export function encode(value, quote = /"/g) {
  return `"${String(value).replace(quote, m => m + m)}"`
}

export function join(values, comma = ',') {
  return values
    .map(value => encode(value))
    .join(comma)
}

// Excel only detects UTF-8 reliably when there is a byte order mark.
const BOM = '﻿'

export function toCSV(header, rows) {
  return BOM + [header, ...rows].map(row => join(row)).join('\r\n') + '\r\n'
}
