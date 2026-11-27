# Anderson Home Library

A buildless, searchable catalog of 572 physical books. Open `index.html` in a modern browser, or serve this folder with `python -m http.server 8765` and visit http://localhost:8765. No installation or paid service is needed.

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

Edits, additions, and archives are stored in this browser's localStorage. To sync across devices, connect Shared updates in the footer. Use Export backup regularly. JSON backups include all records, archived copies, local change history, original catalog, and source audits. CSV export includes copy IDs and archived flags. Import accepts the app's version 1 JSON backups and previews changes before matching by copy ID; it never matches by title or removes records omitted from a backup.

An archived copy remains in backups. To restore it, change its `deleted` flag to false in a JSON backup and import it after reviewing the preview. Original source files always remain available. If browser storage cannot be read, the app shows available catalog data and refuses to overwrite the damaged stored data.

## Reading room and family sync

Open Reading room to browse numbered series and find up to three titles for a reader and genre. Open any copy to save a reader's status or recommendation. Untouched books have unknown status. The picker labels them and lets you exclude them. Series guides use catalog numbering and confirmed omnibus ranges. Haikyu!! and Attack on Titan include publisher-confirmed main-series endpoints.

For shared updates, initialize a separate private GitHub repository with a README, invite family contributors, and have each contributor create a fine-grained token limited to that repository with Contents read/write permission. Open Shared updates in the footer on each device and connect using the same owner/repository and that person's token. Tokens stay in tab memory until disconnect or reload. Each visible connected tab checks every 30 seconds. Sync now checks immediately and lets you resolve divergent edits. Offline edits remain in browser storage. The private file stores changed copies and history. The public site still runs without setup. GitHub Pages visitors see the published base catalog until they connect. GitHub's inline file limit bounds shared history size. Export JSON backups as usual.

## GitHub Pages

Publish from the `main` branch, `/ (root)` folder in Settings > Pages. All paths are relative, so the site works under a project URL. The hosted catalog and source archives are public. No third-party trackers or external images are used.

## Checks

With Node.js installed: `node tests.cjs`. Checks exercise the actual app logic with a minimal DOM stub: preservation, distinct physical-copy identities, unknown bindings, contained-work lookup, typo search, import validation, persistence and storage failure. Visual and interactive browser checks are separate.


## November 21 inventory reconciliation

The 564-copy original remains unchanged. Eight confirmed additions bring the physical inventory to 572. The complete supplied handoff is preserved in `handoff-source.zip`; extracted source files have SHA-256 hashes in `handoff-sha256.json`. Run `python reconcile.py` to rebuild the overlay from the original and dated sources, then `node tests.cjs` to verify it.

`handoff.js` and `reconciliation.json` preserve 139 current Pretty Side placements, field-by-field before/after values, unresolved questions, and direct owner confirmations overriding the original 142-placement handoff. P18 has seven physical books. Reader’s Digest 1980 Vol. 2 is corrected to 1990 Vol. 2 without adding a copy; original contained-work references remain linked by source identity.

Two current Skandia records represent the confirmed paperback at P15 and hardcover at P16. The two old row identities are retained with `historicalOnly: true` and excluded from physical counts. Their correspondence is explicitly unresolved. Exports retain these historical records and flag them separately. There are 574 total records but 572 physical copies. The red sprayed-edge Lord of the Rings is at P24; the blue omnibus stays separate.

Browser upgrades first save a pre-update backup key, then merge changed fields only where personal values still equal the original baseline. Conflicting personal values, manual copies, archived flags, and history are preserved. Differences appear in Corrections & archives. The shelf map describes the confirmed November 21 inventory; personal edits may subsequently differ.
## Bookstore mode and family profiles

Open **Bookstore mode** to scan an ISBN barcode, enter an ISBN, or search by title and author. ISBN-10 and ISBN-13 equivalents match the same edition. If the ISBN has no local match, an ISBN-only search or scan sends the ISBN to Open Library to fill in the title and author and find possible copies on your shelves. Manual title searches stay local and work offline. A title match shows each active copy's binding, edition and shelf. Most initial records lack an ISBN. Open the copy and choose **Edit this copy** to add a verified ISBN. Camera scanning runs on your device and requires camera permission and a supported secure browsing context. Hold the main book barcode horizontally with the bars upright.

In **Reading room**, choose or enter a reader and select **Open profile**. Open any book, select **Want to read**, **Reading** or **Finished**, and save the reader note. Each profile lists its books and recommendations. **Unread** remains available for the nightly picker. Reader lists and notes travel with JSON backups and family sync. Use the updated app on each family device.
## Loans and book hunting

Open a physical copy and select **Lend this copy** to record the borrower and checkout date. **Out on loan** lists outstanding copies. Mark one returned to see its home shelf. Checkout and return events appear in the copy's history.

In **Bookstore mode**, use **Add a wish** to record the title, author, edition you want and why. Mark a book found while shopping. Select **Show found books** to edit it or put it back on the list. Purchases can be cataloged separately using **Add a physical copy**. Loans and wishes travel with the JSON backup and private family sync. Use the updated app on all participating devices.
