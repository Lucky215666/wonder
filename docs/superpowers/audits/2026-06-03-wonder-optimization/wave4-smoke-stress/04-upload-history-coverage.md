# Upload And History Coverage

Date: 2026-06-03

## Coverage Added

| Route | Case | Result |
|---|---|---|
| POST /api/files/parse | No file provided → 400 | PASS |
| POST /api/files/parse | Unsupported extension (.xlsx) → 400 | PASS |
| POST /api/files/parse | File without extension → 400 | PASS |
| POST /api/files/parse | Valid .txt upload → 200 with parsed text | PASS |
| POST /api/files/parse | Valid .md upload → 200 with parsed text | PASS |
| GET /api/history | List returns records with default limit | PASS |
| GET /api/history | Limit parameter forwarded to storage | PASS |
| GET /api/history/:id | Returns single entry | PASS |
| GET /api/history/:id | Returns 404 for missing entry | PASS |
| DELETE /api/history/:id | Deletes existing entry → 200 | PASS |
| DELETE /api/history/:id | Returns 404 for missing entry | PASS |

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `npm run test:server` | PASS | 12 files, 131 tests, 0 failures |

## Remaining Gaps

- PDF/DOCX parse paths not covered (require real file fixtures or pdf-parse/mammoth mocks)
- History limit upper bound not enforced server-side (documented as NODE-P2-005)
