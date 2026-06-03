# Release Candidate Checklist

Date: 2026-06-03
Project: Wonder v0.2.0
Target: Windows portable (.exe) + NSIS installer

---

## Automated Checks

Run from project root. All commands must pass before proceeding to manual checks.

| Step | Command | Expected Result | Status |
|---|---|---|---|
| A1 | `npm install` | Exit 0, no peer-dep errors, `node_modules/` populated | |
| A2 | `npm run typecheck` | Exit 0, zero type errors across all three tsconfig targets | |
| A3 | `npm run test:unit` | Exit 0, all Vitest unit tests pass | |
| A4 | `npm run test:server` | Exit 0, all server route/service tests pass | |
| A5 | `npm run test:python` | Exit 0, all pytest tests pass (requires Python 3.13) | |
| A6 | `npm run test:smoke` | Exit 0, `mock-core-flow.test.ts` passes | |
| A7 | `npm run test:stress` | Exit 0, `batch-and-store.stress.test.ts` passes within timeout | |
| A8 | `npm run build` | Exit 0, `dist/` directory created with Vite output | |
| A9 | `npm run build:server` | Exit 0, `dist-server/server/index.js` exists | |

---

## Manual Desktop Checks

Requires Electron dev environment. Start with `npm run dev:electron`.

### Dev Mode Startup

| Step | Action | Expected Result | Status |
|---|---|---|---|
| D1 | Run `npm run dev:electron` | Electron window opens, Vite dev server at `localhost:5173`, DevTools visible | |
| D2 | Observe window size | Window is at least 900x680, centered on screen | |
| D3 | Click minimize button (top-left custom frame) | Window minimizes to taskbar | |
| D4 | Click maximize/restore button | Window toggles between maximized and restored state | |
| D5 | Click close button | Window closes, all Electron + server processes terminate (check Task Manager) | |
| D6 | Run `npm run dev:electron` again immediately | New instance starts normally (no stale port conflict) | |

### First-Run Configuration

| Step | Action | Expected Result | Status |
|---|---|---|---|
| F1 | Delete `%APPDATA%/wonder/data/` if exists, then launch | Welcome screen appears (no crash from missing data dir) | |
| F2 | Complete Welcome flow (or click Skip) | Redirected to Home page, `.env` config created/validated | |
| F3 | Navigate to Settings page | API key, base URL, model name fields visible with current values | |
| F4 | Change model name, click Save | Success toast/feedback, value persists after page refresh | |

### Upload and Analysis

| Step | Action | Expected Result | Status |
|---|---|---|---|
| U1 | Upload a small PDF (< 5 pages) via Home page | File appears in file list, no error toast | |
| U2 | Upload a `.docx` file | Same as U1 — mammoth conversion succeeds | |
| U3 | Trigger analysis on uploaded PDF | Streaming response renders in Analysis page, progress indicator visible | |
| U4 | Wait for analysis to complete | Full analysis result displayed, entry created in History | |

### Knowledge Base Indexing

| Step | Action | Expected Result | Status |
|---|---|---|---|
| K1 | Navigate to Knowledge page | KB list visible (may be empty on first run) | |
| K2 | Create a new knowledge base | KB appears in list | |
| K3 | Add an analyzed document to the KB | Document chunks indexed, chunk count > 0 | |

### RAG QA

| Step | Action | Expected Result | Status |
|---|---|---|---|
| Q1 | Navigate to QA page, select the KB from K2 | KB selector shows the created KB | |
| Q2 | Ask a question related to the uploaded document | Answer returned with citation references (not hallucinated) | |
| Q3 | Check citation links in answer | Citations reference actual document chunks, links navigate to source | |

### History Detail

| Step | Action | Expected Result | Status |
|---|---|---|---|
| H1 | Navigate to History page | List of past analyses visible | |
| H2 | Click on an analysis entry | Detail page loads with full analysis content | |
| H3 | Verify metadata display | File name, date, model used are shown correctly | |

### Batch Analysis

| Step | Action | Expected Result | Status |
|---|---|---|---|
| B1 | Navigate to Batch page | Batch interface visible | |
| B2 | Select multiple files for batch analysis | Files queued, progress shown per file | |
| B3 | Wait for batch to complete | All files analyzed, results accessible from History | |

### Discovery Search

| Step | Action | Expected Result | Status |
|---|---|---|---|
| S1 | Navigate to Discovery page | Search interface visible | |
| S2 | Search for a term from the uploaded documents | Relevant results returned, not empty | |
| S3 | Click a search result | Navigates to the source document/analysis | |

### Citation Graph

| Step | Action | Expected Result | Status |
|---|---|---|---|
| G1 | Navigate to Citation Network page | Graph visualization renders (may be sparse with few docs) | |
| G2 | Hover/click a node | Node details shown (document title, connection count) | |
| G3 | Verify graph is interactive | Pan/zoom works, no rendering glitches | |

### Settings Save/Load

| Step | Action | Expected Result | Status |
|---|---|---|---|
| T1 | Change API key in Settings, save | Success feedback | |
| T2 | Close and reopen the app | Changed API key is persisted and displayed | |
| T3 | Change base URL to a non-default provider, save | Value persists, subsequent API calls use new base URL | |

### App Close and Restart

| Step | Action | Expected Result | Status |
|---|---|---|---|
| R1 | Close the app via window close button | App exits cleanly, no orphan processes in Task Manager | |
| R2 | Reopen the app | Starts normally, loads previous state (settings, history) | |
| R3 | Kill the app via Task Manager (force kill) | Process terminates | |
| R4 | Reopen after force kill | App recovers, SQLite database is not corrupted (no error on startup) | |

### Data Persistence

| Step | Action | Expected Result | Status |
|---|---|---|---|
| P1 | After restart (R2), check History page | Previous analyses are still listed | |
| P2 | Check Knowledge page | KBs and indexed documents are intact | |
| P3 | Check Settings | All saved settings are preserved | |
| P4 | Verify `%APPDATA%/wonder/data/` contains SQLite DB | `wonder.db` file exists, size > 0 | |

---

## External API Smoke Checks

Keep these minimal to conserve API quota. Use a small, cheap model (e.g. `gpt-4o-mini`).

| Step | Action | Expected Result | Status |
|---|---|---|---|
| E1 | Run a single analysis on a 1-2 page PDF | Streaming response completes without API error | |
| E2 | Ask one RAG question via QA page | Answer returned with valid citations | |
| E3 | Check server logs for 4xx/5xx responses | No unexpected HTTP errors during E1-E2 | |

---

## Known Limitations

- No macOS or Linux testing — checklist is Windows-only.
- No Electron automation framework — all desktop checks are manual.
- No multi-monitor or DPI scaling checks.
- Network proxy/firewall interference not tested.

---

## Release Decision

| Criteria | Status |
|---|---|
| All automated checks (A1-A9) pass | |
| All dev-mode desktop checks (D1-D6) pass | |
| First-run flow works (F1-F4) | |
| Core features work: upload, analysis, KB, QA, history | |
| Batch, discovery, citation graph functional | |
| Settings persist across restart | |
| Data survives close/restart cycle | |
| External API smoke checks pass | |

**Decision:** Ready for RC / Needs Targeted Fix / Blocked

**Notes:**
