# Anderson Home Library — Codex handoff

This handoff is based on **Anderson_Home_Library_Photo_Confirmed.xlsx**, the latest owner/photo-confirmed workbook available in the conversation. It contains **564 physical book records**. The original spreadsheet is preserved verbatim. No titles, authors, ownership, editions, or binding types were invented during this export.

## Contents
- `books.json`: all 564 book records; source column names are preserved, with `_source_row` for traceability.
- `books.csv`: same records, editable/importable CSV (UTF-8 with BOM).
- `puzzles.csv`: puzzle tracking sheet (empty template rows not included).
- `reference_and_audits.json`: all populated audit, identification, Reader's Digest, and puzzle sheet records.
- Other `*.csv` files: individual audit/reference sheets for easy review.
- `Anderson_Home_Library_Photo_Confirmed.xlsx`: source-of-truth workbook.
- `CODEX_BUILD_BRIEF.md`: requirements and ready-to-use Codex prompt.

## Book data fields
`Title`, `Author`, `Genre`, `Series`, `Series #`, `Shelf Look`, `Shelf Area`, `Shelf Code`, `Read Status`, `Owned By`, `Format`, `Edition / Cover`, `Condition`, `Other Genre`, `ISBN`, `Notes`, `Date Added`, `_source_row`.

Current formats: {'Hardcover': 147, 'Paperback': 414, 'Spiral-bound': 1, 'Unverified': 1, 'Blank': 1}. Blank/null is **unknown**, not hardcover or paperback.

## Important data rules
- One row = one physical volume. Omnibus/collected editions can contain many works but count as **one owned object**.
- Duplicate titles may represent physically distinct editions/copies; do **not** deduplicate by title alone.
- Preserve `Shelf Area` / `Shelf Code` and `Shelf Look` (including Pretty/Showpiece), even where shelves may later be reorganized.
- A book marked missing is still owned; do not confuse `missing location` with `not owned`.
- `Owned By` and `Read Status` are sparsely filled: missing values must not be assumed.
- Format should be a simple physical binding: Hardcover, Paperback, Spiral-bound, or Unknown. Clothbound, sprayed edge, leather-like, decorative design, etc. are notes in `Edition / Cover`.
- Reader's Digest condensed volumes: one physical volume per row; individual works searchable as contained works, not independently owned volumes.
- Some audit queue items may be older than the finalized records: show these as historical notes unless unresolved.
- Do not silently change questionable entries. Keep an edit/verification queue for owners.

## Known owner instructions
- Percy Jackson / Rick Riordan copies are paperback.
- `The Aeons' Gate` omnibus is one paperback physical book containing 3 stories.
- `The Cleric Quintet` is one physical omnibus containing five books.
- `The Twin` by Natasha Preston is owned but currently missing after a move; its binding is unverified.
- The green NLT Bible is a cloth-covered hardcover, not a separate format.
- *Avatar: The Last Airbender — Team Avatar Tales* is a separate physical book; its format is currently blank.
- There is only one Templeton Twins title owned, *The Templeton Twins Have an Idea*. *The Multiplying Menace* by Amanda Marrone is a separate Magic Repair Shop book.
- `The Sacketts` is a title in Louis L'Amour's Sackett series; do not reinterpret it as just a series header.
- A `Star of Deltora` book was photo-verified; do not re-open resolved audits as new book counts.

**Audit caveat:** review the source workbook and audit sheets in case there are remaining discrepancies; this package is a faithful export, not an independent bibliographic verification of every ISBN or title.
