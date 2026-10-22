-- Dublin Core Elements (dc:) to Dublin Core Terms (dcterms:), matching the
-- ontology migration that points the Dublin Core and Photo templates at
-- dcterms. If an item already has both properties, the dcterms value wins.
UPDATE OR IGNORE metadata
  SET property = replace(
    property,
    'http://purl.org/dc/elements/1.1/',
    'http://purl.org/dc/terms/')
  WHERE property LIKE 'http://purl.org/dc/elements/1.1/%';

DELETE FROM metadata
  WHERE property LIKE 'http://purl.org/dc/elements/1.1/%';

-- The Tropy Generic and Correspondence templates are no longer offered.
UPDATE subjects
  SET template = 'https://tropy.org/v1/templates/dc'
  WHERE template IN (
    'https://tropy.org/v1/templates/generic',
    'https://tropy.org/v1/templates/correspondence'
  );
