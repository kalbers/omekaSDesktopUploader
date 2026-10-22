-- Omeka S uses Dublin Core Terms (dcterms:), not the older Elements (dc:).
-- Point the Dublin Core and Photo templates at dcterms.
UPDATE fields
  SET property_id = replace(
    property_id,
    'http://purl.org/dc/elements/1.1/',
    'http://purl.org/dc/terms/')
  WHERE template_id IN (
    'https://tropy.org/v1/templates/dc',
    'https://tropy.org/v1/templates/photo'
  );

UPDATE templates
  SET description = 'Generic template based on Dublin Core Terms'
  WHERE template_id = 'https://tropy.org/v1/templates/dc';
