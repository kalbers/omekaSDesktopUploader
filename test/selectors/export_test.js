import { getExportItemIds } from '#internal/selectors/export.js'

describe('Export Selectors', () => {
  describe('getExportItemIds', () => {
    it('selects passed-in ids only', () => {
      expect(getExportItemIds({}, { id: [42] })).to.eql([42])
    })

    describe('when there are items selected', () => {
      it('selects selected items when no id given', () => {
        expect(
          getExportItemIds({ nav: { items: [23] } })
        ).to.eql([23])
      })
    })

    describe('when there are no items selected', () => {
      it('selects all visible items when no id given', () => {
        expect(
          getExportItemIds({
            nav: { items: [] },
            qr: { items: [7] }
          })
        ).to.eql([7])
      })
    })
  })
})
