// Omeka resources a local item, photo or list has been uploaded as.
// Links are kept per Omeka API URL so a project can be uploaded to several
// sites (e.g. staging and production) without the ids colliding.
export default {
  async get(db, baseUrl, type, localId) {
    let row = await db.get(
      `SELECT omeka_id, fingerprint
        FROM omeka_links
        WHERE base_url = ? AND type = ? AND local_id = ?`,
      baseUrl, type, localId)

    return row && { omekaId: row.omeka_id, fingerprint: row.fingerprint }
  },

  set(db, baseUrl, type, localId, omekaId, fingerprint) {
    return db.run(
      `INSERT OR REPLACE INTO omeka_links
        (base_url, type, local_id, omeka_id, fingerprint)
        VALUES (?, ?, ?, ?, ?)`,
      baseUrl, type, localId, omekaId, fingerprint)
  },

  remove(db, baseUrl, type, localId) {
    return db.run(
      `DELETE FROM omeka_links
        WHERE base_url = ? AND type = ? AND local_id = ?`,
      baseUrl, type, localId)
  },

  // Adapter for the Uploader, bound to a database and Omeka API URL.
  store(db, baseUrl) {
    return {
      get: (type, id) => this.get(db, baseUrl, type, id),
      set: (type, id, omekaId, fp) => this.set(db, baseUrl, type, id, omekaId, fp),
      remove: (type, id) => this.remove(db, baseUrl, type, id)
    }
  }
}
