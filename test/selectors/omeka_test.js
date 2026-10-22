import { getOmekaItems, getOmekaLists, getOmekaUpload } from '#internal/selectors/omeka.js'

const PARA = (text) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
})

describe('Omeka selectors', () => {
  const state = {
    nav: { items: [1] },
    qr: { items: [] },
    items: {
      1: { id: 1, lists: [11], photos: [5, 6] },
      2: { id: 2, lists: [], photos: [] }
    },
    metadata: {
      1: { id: 1, title: { text: 'Item' } },
      5: { id: 5, title: { text: 'Photo' } }
    },
    photos: {
      5: {
        id: 5,
        path: '/a/b.jpg',
        protocol: 'file',
        filename: 'b.jpg',
        mimetype: 'image/jpeg',
        checksum: 'abc',
        notes: [7, 8]
      },
      6: {
        id: 6,
        path: '/c/d.png',
        protocol: 'file',
        filename: 'd.png',
        mimetype: 'image/png',
        checksum: 'def',
        notes: []
      }
    },
    notes: {
      7: { state: { doc: PARA('one') } },
      8: { state: { doc: {} } }
    },
    lists: {
      0: { id: 0, name: 'ROOT', parent: null, children: [10] },
      10: { id: 10, name: 'Parent', parent: 0, children: [11] },
      11: { id: 11, name: 'Child', parent: 10, children: [] }
    }
  }

  describe('getOmekaItems', () => {
    let items

    before(() => {
      items = getOmekaItems(state, [1, 2])
    })

    it('converts items with their lists and metadata', () => {
      expect(items).to.have.length(2)
      expect(items[0]).to.include({ id: 1 })
      expect(items[0].lists).to.eql([11])
      expect(items[0].metadata.title.text).to.eql('Item')
    })

    it('converts photos with their file details', () => {
      expect(items[0].photos.map(p => p.id)).to.eql([5, 6])
      expect(items[0].photos[0]).to.include({
        path: '/a/b.jpg',
        protocol: 'file',
        filename: 'b.jpg',
        mimetype: 'image/jpeg',
        checksum: 'abc'
      })
      expect(items[0].photos[0].metadata.title.text).to.eql('Photo')
    })

    it('has no region selections', () => {
      for (let photo of items[0].photos)
        expect(photo).not.to.have.property('selections')
    })

    it('converts notes to html, skipping empty ones', () => {
      expect(items[0].photos[0].notes).to.eql(['<p>one</p>'])
      expect(items[0].photos[1].notes).to.eql([])
    })

    it('handles items without photos', () => {
      expect(items[1].photos).to.eql([])
    })
  })

  describe('getOmekaLists', () => {
    it('maps list ids to name and parent', () => {
      expect(getOmekaLists(state)[11])
        .to.eql({ id: 11, name: 'Child', parent: 10 })
    })
  })

  describe('getOmekaUpload', () => {
    it('uses the given ids', () => {
      expect(getOmekaUpload(state, { id: [2] }).items.map(i => i.id))
        .to.eql([2])
    })

    it('falls back to the items in the current view', () => {
      expect(getOmekaUpload(state).items.map(i => i.id)).to.eql([1])
    })
  })
})
