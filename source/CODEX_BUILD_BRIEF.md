# CODEX BUILD BRIEF — Anderson Home Library

Build a polished, responsive, **local-first searchable library website** from `books.json` with the existing workbook kept as an archival source. Use a maintainable stack (React + TypeScript + Vite is a good default) and make it easy to run locally on Windows 11 in VS Code. Do not require paid services, accounts, or cloud infrastructure for the initial build.

## Phase 1 — Must have
1. Import all book records; preserve unique physical copies and store stable IDs derived from original `_source_row` during initial import (generate persistent UUIDs for new entries). Never use title as a unique key.
2. Full-text, forgiving search over title, author, series, genre, ISBN, notes, contained works, shelf code, and edition. Support spelling-tolerant/fuzzy queries and case-insensitive lookup.
3. Filters: Hardcover / Paperback / Spiral-bound / Unknown, genre, series, owner (including unspecified), read status, Pretty Side vs other shelves, Shelf Look / Showpiece, missing / uncertain metadata.
4. Book detail page: all source metadata, notes, exact shelf location, format, edition features, verification state, and one-physical-volume principle for omnibus books.
5. Dashboard showing total physical copies, unique titles (separate statistic), shelves, formats, genres, books with missing information, and missing-after-move entries.
6. CRUD (add/edit/remove) with simple validation; browser-local persistence via IndexedDB or localStorage and a one-click backup/export to JSON and CSV. Include import-and-merge with preview and safeguards so edits cannot disappear on reload.
7. Search Reader's Digest contents using `readers_digest_verified.csv`; results must link to owning volume, not appear as independently owned copies.
8. Responsive, accessible interface: keyboard navigation, good contrast, legible at mobile size; do not rely on color alone to convey status.
9. Preserve historical audit/reference materials and allow a separate, clearly labelled 'Needs Verification' queue.

## Data integrity requirements
- Start with source metadata exactly as provided. No hallucinated cover images, invented ISBNs, inferred owners, or auto-correction of source fields.
- Null and empty are unknown. Keep title/author corrections traceable.
- Support multiple formats/editions of the same title, and physical copies of identical editions.
- Omnibus remains one item regardless of contained-work count.
- If choosing to show external bibliographic cover data later, make it opt-in and clearly attributed; source record wins.
- Parse spreadsheet-style dates safely and avoid timezone-induced date shifts.

## Suggested initial structure
`src/data/books.json`, `src/data/audits.json`, `src/types/book.ts`, `src/lib/search.ts`, `src/lib/storage.ts`, `src/components/BookCard.tsx`, `src/components/BookFilters.tsx`, `src/pages/LibraryPage.tsx`, `src/pages/BookDetail.tsx`, `src/pages/Dashboard.tsx`, `src/pages/ReviewQueue.tsx`.

## Deliverables
- A working local app, `README.md` with Windows install/run steps, sample screenshots if feasible, and tests for duplicate copies, omnibus counts, unknown bindings, search, and local persistence.
- Add a clear distinction between 'Imported catalog: 564 records' and any later user-created/removed records.
- Start with a clean book-oriented design inspired by dark shelving, subdued lavender/silver accents, and a visually distinct 'Pretty Side' gallery; don't prioritize decoration over usability.

**Codex initial instruction:** “Read `README.md`, `books.json`, `reference_and_audits.json`, and this build brief. First audit the schema and summarize any issues without mutating the input data. Then implement the local-first library site with full search, filters, edit/import/export, shelf codes, copies, Reader's Digest contained works, and a verification queue. Preserve every physical volume as its own record. Run tests and document how to start it.”
