CREATE TABLE omeka_links (
  base_url     TEXT     NOT NULL,
  type         TEXT     NOT NULL,
  local_id     INTEGER  NOT NULL,
  omeka_id     INTEGER  NOT NULL,
  fingerprint  TEXT     NOT NULL,
  uploaded     NUMERIC  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (type IN ('item', 'media', 'item_set', 'notes')),

  PRIMARY KEY (base_url, type, local_id)
) WITHOUT ROWID;

-- Local ids can be reused by SQLite after deletion: don't keep stale links.
CREATE TRIGGER delete_omeka_links_on_subject_delete
  AFTER DELETE ON subjects
  BEGIN
    DELETE FROM omeka_links
      WHERE type IN ('item', 'media', 'notes') AND local_id = old.id;
  END;

CREATE TRIGGER delete_omeka_links_on_list_delete
  AFTER DELETE ON lists
  BEGIN
    DELETE FROM omeka_links WHERE type = 'item_set' AND local_id = old.list_id;
  END;
