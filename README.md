# Anderson Home Library

A buildless, searchable catalog of 564 physical books. Open `index.html` in a modern browser, or serve this folder with `python -m http.server 8765` and visit http://localhost:8765. No installation or paid service is needed.

## Data preservation

- `source/` contains all 16 original handoff files, including the unchanged workbook, JSON, CSV files, and historical corrections. `source-sha256.json` records their SHA-256 hashes.
- `data.js` is a generated copy of the original JSON for offline loading. Source fields and nulls are preserved.
- Imported copy IDs use the original worksheet row: `source-row-N`. Titles are never unique keys. Omnibus contents and Reader's Digest stories are searchable but do not add physical copies.
- Unknown bindings are displayed as Unknown; the source values (including Unverified and null) remain unchanged in details.
- Historical audit status is shown as recorded, not reinterpreted as a current bibliographic judgment. Only explicit source-row references are linked in book details. No missing authors, ISBNs, editions, owners, or dates are inferred.

## Using the catalog

Search title, author, series, genre, ISBN, notes, edition, shelf, or contained works. Search ignores case and accents and tolerates a single inserted, deleted, or substituted character for words of at least five characters. Filter by binding, owner, read status, genre, series, shelf area/code/look, or metadata notes. Pretty Side is its own browsing view.

Corrections & archives searches each original reference section and provides original-file downloads. Source-status filtering is deliberately limited to Identification Queue entries marked Needs photo; older optional and resolved audits remain historical.

## Personal edits and backups

Edits, additions, and archives are stored in this browser's localStorage. **They do not update GitHub or sync between devices.** Use Export backup regularly. JSON backups include all records, archived copies, local change history, original catalog, and source audits. CSV export includes copy IDs and archived flags. Import accepts the app's version 1 JSON backups and previews changes before matching by copy ID; it never matches by title or removes records omitted from a backup.

An archived copy remains in backups. To restore it, change its `deleted` flag to false in a JSON backup and import it after reviewing the preview. Original source files always remain available. If browser storage cannot be read, the app shows the original catalog and refuses to overwrite the damaged stored data.

## GitHub Pages

Publish from the `main` branch, `/ (root)` folder in Settings > Pages. All paths are relative, so the site works under a project URL. The hosted catalog and source archives are public. No third-party trackers or external images are used.

## Checks

With Node.js installed: `node tests.cjs`. Checks exercise the actual app logic with a minimal DOM stub: preservation, distinct physical-copy identities, unknown bindings, contained-work lookup, typo search, import validation, persistence and storage failure. Visual and interactive browser checks are separate.
