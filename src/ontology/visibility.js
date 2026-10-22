// Omeka S sites commonly have a small set of vocabularies, so the interface
// offers only Dublin Core Terms (plus any vocabularies or templates the user
// imports). The other bundled vocabularies and templates stay in the ontology
// database, so existing metadata still displays and this is easily reversed.

export const HIDDEN_VOCABULARIES = new Set([
  'http://id.loc.gov/ontologies/bibframe/',
  'http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/',
  'http://iptc.org/std/Iptc4xmpExt/2008-02-29/',
  'http://ns.adobe.com/photoshop/1.0/',
  'http://ns.adobe.com/xap/1.0/',
  'http://ns.adobe.com/xap/1.0/mm/',
  'http://ns.adobe.com/xap/1.0/rights/',
  'http://ns.adobe.com/xmp/identifier/qual/1.0/',
  'http://ns.useplus.org/ldf/xmp/1.0/',
  'http://purl.org/dc/elements/1.1/',
  'http://www.europeana.eu/schemas/edm/',
  'http://www.openarchives.org/ore/terms/',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'http://www.w3.org/2000/01/rdf-schema#',
  'http://www.w3.org/2001/XMLSchema#',
  'http://www.w3.org/2003/12/exif/ns#',
  'http://www.w3.org/2004/02/skos/core#',
  'http://xmlns.com/foaf/0.1/',
  'https://tropy.org/v1/tropy#'
])

export const HIDDEN_TEMPLATES = new Set([
  'https://tropy.org/v1/templates/generic',
  'https://tropy.org/v1/templates/correspondence',
  'https://tropy.org/v1/templates/selection'
])

export const isVocabularyVisible = (id) => !HIDDEN_VOCABULARIES.has(id)
export const isTemplateVisible = (id) => !HIDDEN_TEMPLATES.has(id)
