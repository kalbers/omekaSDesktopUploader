import {
  getDatatypeList,
  getItemTemplates,
  getPhotoTemplates,
  getPropertyList,
  getVocabs,
  selectTemplatesByType
} from '#internal/selectors/ontology.js'
import {
  isTemplateVisible,
  isVocabularyVisible
} from '#internal/ontology/visibility.js'

const DCT = 'http://purl.org/dc/terms/'
const EXIF = 'http://www.w3.org/2003/12/exif/ns#'
const DC = 'http://purl.org/dc/elements/1.1/'
const CUSTOM = 'http://example.org/custom/'
const TROPY = 'https://tropy.org/v1/tropy#'

const state = {
  ontology: {
    vocab: {
      [DCT]: { id: DCT, prefix: 'dcterms', properties: [`${DCT}title`], classes: [], datatypes: [] },
      [EXIF]: { id: EXIF, prefix: 'exif', properties: [`${EXIF}make`], classes: [], datatypes: [] },
      [DC]: { id: DC, prefix: 'dc', properties: [`${DC}title`], classes: [], datatypes: [] },
      [CUSTOM]: { id: CUSTOM, prefix: 'x', properties: [`${CUSTOM}thing`], classes: [], datatypes: [] }
    },
    props: {
      [`${DCT}title`]: { id: `${DCT}title`, vocabulary: DCT },
      [`${EXIF}make`]: { id: `${EXIF}make`, vocabulary: EXIF },
      [`${DC}title`]: { id: `${DC}title`, vocabulary: DC },
      [`${CUSTOM}thing`]: { id: `${CUSTOM}thing`, vocabulary: CUSTOM }
    },
    class: {},
    type: {
      [`${TROPY}date`]: { id: `${TROPY}date`, vocabulary: TROPY }
    },
    template: {
      'https://tropy.org/v1/templates/dc': {
        id: 'https://tropy.org/v1/templates/dc', name: 'Dublin Core', type: `${TROPY}Item`, fields: []
      },
      'https://tropy.org/v1/templates/generic': {
        id: 'https://tropy.org/v1/templates/generic', name: 'Tropy Generic', type: `${TROPY}Item`, fields: []
      },
      'https://tropy.org/v1/templates/correspondence': {
        id: 'https://tropy.org/v1/templates/correspondence', name: 'Tropy Correspondence', type: `${TROPY}Item`, fields: []
      },
      'https://tropy.org/v1/templates/photo': {
        id: 'https://tropy.org/v1/templates/photo', name: 'Tropy Photo', type: `${TROPY}Photo`, fields: []
      },
      'https://tropy.org/v1/templates/selection': {
        id: 'https://tropy.org/v1/templates/selection', name: 'Tropy Selection', type: `${TROPY}Selection`, fields: []
      },
      'http://example.org/templates/mine': {
        id: 'http://example.org/templates/mine', name: 'Mine', type: `${TROPY}Item`, fields: []
      }
    }
  }
}

describe('Ontology visibility', () => {
  it('shows only Dublin Core Terms among the bundled vocabularies', () => {
    expect(isVocabularyVisible(DCT)).to.be.true
    for (let hidden of [EXIF, DC, TROPY])
      expect(isVocabularyVisible(hidden), hidden).to.be.false
  })

  it('shows vocabularies the user adds', () => {
    expect(isVocabularyVisible(CUSTOM)).to.be.true
  })

  it('lists only visible properties', () => {
    expect(getPropertyList(state).map(p => p.id))
      .to.have.members([`${DCT}title`, `${CUSTOM}thing`])
  })

  it('lists only visible vocabularies', () => {
    expect(getVocabs(state).map(v => v.id))
      .to.have.members([DCT, CUSTOM])
  })

  it('still lists all datatypes', () => {
    expect(getDatatypeList(state).map(d => d.id)).to.eql([`${TROPY}date`])
  })

  it('hides the Tropy item templates, keeps Dublin Core and the user\'s own', () => {
    expect(getItemTemplates(state).map(t => t.name))
      .to.eql(['Dublin Core', 'Mine'])
    expect(selectTemplatesByType(state, { type: `${TROPY}Item` }).map(t => t.name))
      .to.eql(['Dublin Core', 'Mine'])
  })

  it('keeps the photo template and hides the selection template', () => {
    expect(getPhotoTemplates(state).map(t => t.name)).to.eql(['Tropy Photo'])
    expect(isTemplateVisible('https://tropy.org/v1/templates/selection'))
      .to.be.false
  })

  it('does not remove hidden resources from the ontology itself', () => {
    expect(state.ontology.props).to.have.property(`${EXIF}make`)
    expect(state.ontology.template)
      .to.have.property('https://tropy.org/v1/templates/generic')
  })
})
