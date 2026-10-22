export const getExportItemIds = ({ nav, qr }, { id } = {}) =>
  (id?.length > 0) ? id : (nav.items.length > 0 ? nav.items : qr.items)
