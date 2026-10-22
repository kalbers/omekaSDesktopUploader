import { nav } from '#internal/reducers/nav.js'
import { settings } from '#internal/reducers/settings.js'
import { NAV, SETTINGS } from '#internal/constants/index.js'

const DC = 'http://purl.org/dc/elements/1.1/'
const DCT = 'http://purl.org/dc/terms/'
const GENERIC = 'https://tropy.org/v1/templates/generic'
const DUBLIN = 'https://tropy.org/v1/templates/dc'

describe('restoring state saved by earlier versions', () => {
  describe('settings', () => {
    const restore = (payload) =>
      settings(undefined, { type: SETTINGS.RESTORE, payload })

    it('defaults new installs to Dublin Core Terms', () => {
      let state = restore({})

      expect(state.templates.item).to.eql(DUBLIN)
      expect(state.title.item).to.eql(`${DCT}title`)
      expect(state.title.photo).to.eql(`${DCT}title`)
    })

    it('replaces a saved Tropy Generic default template', () => {
      expect(restore({ templates: { item: GENERIC } }).templates.item)
        .to.eql(DUBLIN)
    })

    it('upgrades the saved file-name property', () => {
      let state = restore({
        title: { item: `${DC}title`, photo: `${DC}title`, force: true }
      })

      expect(state.title).to.eql({
        item: `${DCT}title`,
        photo: `${DCT}title`,
        force: true
      })
    })

    it('keeps a user template and other settings', () => {
      let state = restore({
        templates: { item: 'http://example.org/mine' },
        density: 300
      })

      expect(state.templates.item).to.eql('http://example.org/mine')
      expect(state.density).to.eql(300)
    })
  })

  describe('nav', () => {
    const restore = (payload) =>
      nav(undefined, { type: NAV.RESTORE, payload })

    it('has Dublin Core Terms columns by default', () => {
      expect(restore({}).columns.slice(0, 4).map(c => c.id)).to.eql([
        `${DCT}title`,
        `${DCT}creator`,
        `${DCT}date`,
        `${DCT}type`
      ])
    })

    it('upgrades saved columns and sort', () => {
      let state = restore({
        columns: [{ id: `${DC}title`, width: 300 }, { id: 'created', width: 100 }],
        sort: { 0: { column: `${DC}title`, asc: false } }
      })

      expect(state.columns).to.eql([
        { id: `${DCT}title`, width: 300 },
        { id: 'created', width: 100 }
      ])
      expect(state.sort[0]).to.eql({ column: `${DCT}title`, asc: false })
    })
  })
})
