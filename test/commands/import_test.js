import { ImportCommand } from '#internal/commands/import.js'
import { dcterms } from '#internal/ontology/ns.js'

describe('ImportCommand', () => {
  // getImageMetadata only reads its arguments
  const cmd = Object.create(ImportCommand.prototype)

  const template = (...props) => ({
    fields: props.map(property => ({ property }))
  })

  const prefs = {
    title: { item: dcterms.title, photo: dcterms.title, force: false }
  }

  const image = {
    name: 'letter.jpg',
    date: new Date('2020-03-04T05:06:07Z'),
    description: 'A scanned letter',
    data: {}
  }

  describe('getImageMetadata', () => {
    it('names items after the file, in dcterms:title', () => {
      let data = cmd.getImageMetadata(
        'item', image, template(dcterms.title, dcterms.creator), prefs)

      expect(data[dcterms.title]).to.have.property('text', 'letter.jpg')
      expect(Object.keys(data)).not.to.include('http://purl.org/dc/elements/1.1/title')
    })

    it('adds the photo date and description as dcterms', () => {
      let data = cmd.getImageMetadata(
        'photo', image, template(dcterms.title, dcterms.date), prefs)

      expect(data[dcterms.title]).to.have.property('text', 'letter.jpg')
      expect(data[dcterms.date]).to.have.property('text')
      expect(data[dcterms.description])
        .to.have.property('text', 'A scanned letter')

      for (let key of Object.keys(data))
        expect(key, key).to.match(/^http:\/\/purl\.org\/dc\/terms\//)
    })

    it('keeps an existing title unless forced', () => {
      let withTitle = { ...image, data: { [dcterms.title]: { text: 'Kept' } } }
      let tpl = template(dcterms.title)

      expect(cmd.getImageMetadata('item', withTitle, tpl, prefs)[dcterms.title])
        .to.have.property('text', 'Kept')

      expect(cmd.getImageMetadata('item', withTitle, tpl, {
        title: { ...prefs.title, force: true }
      })[dcterms.title]).to.have.property('text', 'letter.jpg')
    })
  })
})
