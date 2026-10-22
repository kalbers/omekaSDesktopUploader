import { getCSVExport } from '#internal/selectors/csv.js'
import { toCSV } from '#internal/common/csv.js'

const DC = 'http://purl.org/dc/terms/'
const DCE = 'http://purl.org/dc/elements/1.1/'

const PARA = (text) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

describe('CSV export', () => {
  const state = {
    nav: { items: [1, 2] },
    qr: { items: [] },
    ontology: {
      vocab: {
        [DC]: { prefix: 'dcterms' },
        [DCE]: { prefix: 'dc' }
      },
      template: {
        t1: { fields: [{ property: `${DC}title` }, { property: `${DC}date` }] }
      }
    },
    items: {
      1: { id: 1, template: 't1', lists: [11], photos: [5] },
      2: { id: 2, template: 't1', lists: [], photos: [] }
    },
    metadata: {
      1: {
        'id': 1,
        [`${DC}title`]: { text: 'First "quoted"' },
        'http://example.org/extra': { text: 'x' }
      },
      2: { id: 2, [`${DCE}title`]: { text: 'Second' } }
    },
    lists: {
      0: { id: 0, name: 'ROOT' },
      10: { id: 10, name: 'Parent', parent: 0 },
      11: { id: 11, name: 'Child', parent: 10 }
    },
    photos: {
      5: { id: 5, path: '/a/b.jpg', notes: [7, 8] }
    },
    notes: {
      7: { state: { doc: PARA('photo note') } },
      8: { state: { doc: PARA('second note') } }
    }
  }

  describe('getCSVExport', () => {
    let csv

    before(() => {
      csv = getCSVExport(state, {})
    })

    it('uses template fields, then other properties, as columns', () => {
      expect(csv.header).to.eql([
        'dcterms:title',
        'dcterms:date',
        'http://example.org/extra',
        'lists',
        'files',
        'notes'
      ])
    })

    it('has a row per item', () => {
      expect(csv.rows).to.have.length(2)
      expect(csv.rows[0]).to.eql([
        'First "quoted"',
        '',
        'x',
        'Parent / Child',
        '/a/b.jpg',
        '<p>photo note</p><hr/><p>second note</p>'
      ])
      expect(csv.rows[1]).to.eql(['Second', '', '', '', '', ''])
    })

    it('merges dc: and dcterms: properties into dcterms: columns', () => {
      expect(csv.header.filter(h => h.endsWith(':title')))
        .to.eql(['dcterms:title'])
      expect(csv.rows[1][0]).to.eql('Second')
    })

    it('exports only the given items', () => {
      expect(getCSVExport(state, { id: [2] }).rows).to.have.length(1)
    })
  })

  describe('toCSV', () => {
    it('quotes every field and escapes quotes', () => {
      let out = toCSV(['a', 'b'], [['x "y"', 'z\nw']])
      expect(out).to.eql('﻿"a","b"\r\n"x ""y""","z\nw"\r\n')
    })
  })
})
