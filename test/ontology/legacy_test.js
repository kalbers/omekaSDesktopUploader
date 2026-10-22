import {
  upgradeColumns,
  upgradeProperty,
  upgradeSort,
  upgradeTemplate
} from '#internal/ontology/legacy.js'

const DC = 'http://purl.org/dc/elements/1.1/'
const DCT = 'http://purl.org/dc/terms/'
const GENERIC = 'https://tropy.org/v1/templates/generic'
const DUBLIN = 'https://tropy.org/v1/templates/dc'

describe('legacy ontology upgrades', () => {
  describe('upgradeProperty', () => {
    it('moves Dublin Core Elements to Terms', () => {
      expect(upgradeProperty(`${DC}title`)).to.eql(`${DCT}title`)
      expect(upgradeProperty(`${DC}coverage`)).to.eql(`${DCT}coverage`)
    })

    it('leaves everything else alone', () => {
      expect(upgradeProperty(`${DCT}title`)).to.eql(`${DCT}title`)
      expect(upgradeProperty('http://example.org/x')).to.eql('http://example.org/x')
      expect(upgradeProperty(undefined)).to.be.undefined
      expect(upgradeProperty(null)).to.be.null
    })
  })

  describe('upgradeTemplate', () => {
    it('replaces templates which are no longer offered', () => {
      expect(upgradeTemplate(GENERIC, DUBLIN)).to.eql(DUBLIN)
    })

    it('keeps offered and user templates', () => {
      expect(upgradeTemplate(DUBLIN, 'x')).to.eql(DUBLIN)
      expect(upgradeTemplate('http://example.org/mine', 'x'))
        .to.eql('http://example.org/mine')
    })

    it('keeps missing values missing', () => {
      expect(upgradeTemplate(undefined, DUBLIN)).to.be.undefined
    })
  })

  describe('upgradeColumns', () => {
    it('upgrades property columns and keeps the rest', () => {
      expect(upgradeColumns([
        { id: `${DC}title`, width: 250 },
        { id: 'created', width: 190 }
      ])).to.eql([
        { id: `${DCT}title`, width: 250 },
        { id: 'created', width: 190 }
      ])
    })

    it('passes through non-lists', () => {
      expect(upgradeColumns(undefined)).to.be.undefined
    })
  })

  describe('upgradeSort', () => {
    it('upgrades the sort column of every list', () => {
      expect(upgradeSort({
        0: { column: `${DC}title`, asc: true },
        7: { column: 'created', asc: false }
      })).to.eql({
        0: { column: `${DCT}title`, asc: true },
        7: { column: 'created', asc: false }
      })
    })

    it('passes through empty sort state', () => {
      expect(upgradeSort({})).to.eql({})
      expect(upgradeSort(undefined)).to.be.undefined
    })
  })
})
