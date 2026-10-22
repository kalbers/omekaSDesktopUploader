# Omeka Desktop Upload — fork plan

Base: Tropy v1.17.2 (AGPL-3.0-or-later) + tropy-plugin-omeka 2.0.1 (AGPL-3.0).
Both are AGPL, so the fork stays AGPL and must keep upstream copyright/AUTHORS.

## 1. What the plugin does (all of it, ~490 lines)
- `export` hook receives Tropy items as JSON-LD (expanded by core `context.json.expand`).
- `GET /vocabularies` + `/properties` -> map property URI -> Omeka property id.
- `POST /items` with literal values (dc elements converted to dcterms; unmapped props are
  logged as missing; optional `o:resource_template`).
- `POST /media` (multipart, `ingester: upload`) per photo; each selection is cropped via
  Electron `nativeImage` and uploaded as its own media.
- Notes (photo + selection) concatenated as HTML into one extra media (`ingester: html`).
- Auth via `key_identity`/`key_credential` query params. Per-item errors are logged, not fatal.

## 2. Keep (core data model and UI)
- Items, photos, selections, metadata, templates, vocabularies/ontology (needed to map
  to Omeka properties), lists (become Omeka item sets), notes, SQLite project DB,
  import of local image files (drag/drop, File > Import), thumbnails/cache, Esper image viewer
  (selections are uploaded), search, item/photo/metadata panels, prefs/locale.
- Project files (.tropy) as the app's own working-set format (no importing of *Tropy* projects needed).

## 3. Merge into core
- New `src/common/omeka/` (api.js, constants.js, http.js) ported from the plugin to ESM,
  using core logger and `fetch`; no plugin loader or JSON-LD round trip: build Omeka payloads
  directly from the item/photo/selection/note models (`src/commands/item/export.js` and
  `src/common/export.js` are the current hook entry points).
- Omeka connection settings (URL, identity, credential, resource template ID) move into app
  Preferences (new "Omeka" pane) instead of plugin options. Store credential via
  Electron `safeStorage`, not plain JSON.
- "Upload to Omeka S" action (menu, toolbar, context menu) + progress/results dialog
  (per-item status, missing-property warnings, retry failed).

## 4. Remove (not useful for Omeka upload)
- Plugin system: `src/common/plugins.js`, `src/components/plugin/*`, prefs plugin pane, `res/plugins`, plugin menus/IPC.
- Other exports/sharing: JSON-LD export, `iiif.js`, note/tag export commands. **Keep CSV export** (`src/common/csv.js`, item export command, export settings pane).
- Tags: remove from UI, DB (migration), commands, sagas, reducers, selectors.
- Printing: `src/components/print/*`, `src/views/print.js`, print settings, `papersize.js`.
- Transcriptions (ALTO/OCR/`transcription` commands, components, slice/saga) .
- Tropy-project import (`import.js`, `use-drop-project-files`), QR, `api` command set/main api (external local API),
  updater (`updater.js`, squirrel, win-shell, `tropy.org` links), about/branding, crash/analytics-ish bits if any.
- Optional later: merge/explode items, consolidation (photo path repair), project-wide watch folder, ttp templates unused by Omeka, vocab files not offered by Omeka (keep dc, dcterms, foaf, bibo-like ones that exist in Omeka).

## 5. Rebrand
- productName "Omeka Desktop Upload", appId, desktop/metainfo files, icons, strings
  (`res/strings`), menu text, about window, repository/homepage fields, userData dir name (separate from Tropy).

## 6. Order of work
1. Install deps, run unmodified build (`npm ci`, `npm start`) to get a working baseline.
2. Port Omeka client to core + Prefs pane + Upload action; verify against http://localhost/omeka-s
   (items, media, selections, notes, resource template).
3. Unit tests for payload building and API client (fetch mocked).
4. Remove features in the order: plugins -> exports -> print -> transcription -> import/api/updater, running lint+tests after each.
5. Rebrand and packaging (`npm run build` / `pack`).

## Decisions (from user)
- Global credentials (safeStorage). Remember Omeka IDs and update on re-upload. Lists -> item sets. Tags removed. CSV export kept.
- Sync: new `omeka_links` table (base_url, type item|media|item_set|notes, local_id, omeka_id, fingerprint, uploaded_at).
  First upload POST, re-upload PATCH; media file change (photo checksum / selection crop) => delete + re-upload;
  404 on PATCH => recreate; local deletes do not delete remotely; app wins on conflicts.
- Nested lists flatten to item sets named by path ("Parent / Child") (proposed, unconfirmed).

## Open questions (resolved above except nested lists)
- Credentials: store per-project or global? (proposal: global, in safeStorage)
- Upload mode: always create new items, or later also update items already uploaded (record Omeka ids locally)?
- Keep tags (as Omeka item sets / sites?) or drop? Currently the plugin ignores tags and lists.

## Build notes
- Fresh `npm ci` leaves the sharp binding missing from the bundle. Fix:
  `mkdir -p node_modules/sharp/src/build/Release && cp node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64.node node_modules/sharp/src/build/Release/ && npm run rollup`
  (prebuilt libvips: no HEIC/HEIF).
- System Node is 18; repo needs >= 20. Use `ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron <script>` for scripts.
- Dev run: `npx electron --app . --env development --data tmp --cache tmp/cache --logs tmp/log --no-sandbox`

## Progress
- [x] 1. Baseline build/run
- [x] 2. Omeka client, link table, settings pane, upload command (verified in app by user)
- [ ] 3. Tests for command/selector (partially covered)
- [ ] 4. Removals: [x] plugins+locale files (infra kept, en only) -> [x] exports (CSV items export added; JSON-LD/notes/tags export removed) -> [x] tags (UI+code removed; tags/taggings tables left inert in DB) + local API + print -> [x] transcription (code+UI+alto-xml removed; table left inert) -> [x] selections (region tool, UI, commands, uploads of crops removed; selections table left inert) -> [ ] updater/QR/about/branding links
- [x] 5. Rebrand (text/identity) + Linux packaging (dist/Omeka Desktop Upload-linux-x64). Logo/icons still Tropy's; macOS/Windows packaging untested

## Packaging notes
- Build (Linux): `npx -y node@22 --disable-warning=ExperimentalWarning scripts/build.js --platform linux --arch x64` -> `dist/Omeka Desktop Upload-linux-x64/omeka-desktop-upload` (needs `npm run clean && npm run rollup` first; electron-packager fails silently under Electron's embedded Node).
- Needs the sharp binding copy (see Build notes) and `vendor/sharp/THIRD-PARTY-NOTICES.json` (libvips licence notice for the prebuilt libvips).
- Icons: build.js uses `ICON_NAME='tropy'` (upstream artwork) until replacement artwork exists.
- Done: version 0.1.0, Omeka S logo icons (macOS .icns still to generate on a Mac). Open: source/repo URL for AGPL notice in About, macOS plist document types still mention Tropy, Windows installer assets.

## Project files (decided 2026-10-22)
- A project is a single SQLite file, extension `.odu`, which links to files (absolute paths, or relative to the project file / home via the "Link photos" setting). The Standard/managed (folder + copied assets) type, conversion, and Store were removed.
- Old Tropy projects (.tropy/.tpy) are not supported. Template files keep `.ttp`.
- Linux registers application/vnd.omeka.desktop-upload.project (*.odu); macOS plist declares the `.odu` type (untested).
