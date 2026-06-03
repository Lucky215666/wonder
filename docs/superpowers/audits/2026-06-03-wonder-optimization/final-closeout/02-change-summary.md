# Optimization Change Summary

Date: 2026-06-03

## User-Facing Improvements

- Welcome page now has a skip button to bypass the research step.
- QA page shows a timeout indicator and prevents duplicate sends while waiting.
- Search errors in Discovery are now distinguished from "no results found" — users see a clear error message instead of an empty list.
- CitationNetwork shows a warning when the graph loads partially instead of silently hiding missing data.
- ChatMessage distinguishes "no sources" from "sources loading" so users don't misinterpret empty state.
- Error messages throughout QA, History, CitationNetwork, and Discovery now surface Chinese-language user-friendly messages instead of raw technical errors.
- Settings modal shows a loading spinner while saving and catches save failures gracefully.
- Discovery write actions (save papers, etc.) are guarded against double-submit and show errors on failure.
- History deletion catches errors and shows feedback instead of failing silently.
- Config store reports save errors to the UI instead of swallowing them.
- Knowledge base list is cached to avoid redundant fetches on navigation.

## Stability Improvements

- Python file parsing hardened: encrypted PDF detection, BadZipFile guard, extension whitelist, encoding warning, overlap assertion, empty string guard.
- Python provider hardened: empty choices guard, CORS config, Pydantic model validation, dict safety.
- Server routes hardened: discovery validates paperId/title (400), history limits capped to 500 with NaN fallback, batch O(n²) query replaced with O(n) single query, config rejects empty body.
- AbortSignal support added to all API request methods — callers can cancel in-flight requests.
- Discovery store refactored with saving guards and try/catch on all write paths.
- Knowledge store: empty catches replaced with proper error handling, saving guard added, KB list cached.
- Analysis result normalization shared across components to prevent duplicate logic.
- Python SSE `complete` event now emitted after worker thread finishes.
- SQLite storage properly closed on Electron app quit.

## Testing And Verification Improvements

- Smoke test suite added: 6 tests covering full core flow (config → analyze → add to KB → ask QA → view history), CRUD, error handling, Python backend failure.
- Stress test suite added: 11 tests covering queue concurrency bounds, burst load, task rejection resilience, repeated store operations, unhandled rejection guard.
- Upload and history route test coverage added.
- Discovery store error path tests added.
- Config store error tests added.
- Route-level tests added for citation, config, discovery, and history endpoints.
- Total test count grew from 281 (Wave 1) to 507 (Wave 5) across server, unit, smoke, stress, and Python suites.

## Developer Tooling Improvements

- `test:smoke` and `test:stress` script entrypoints registered in package.json.
- `verify:full` command added — runs typecheck + unit + python + smoke + stress in one pass.
- TypeScript type declarations added for `react-markdown` and `remark-gfm`.
- `after-pack` script hardened: rcedit resolution from `electron-winstaller/vendor` with clear error if binary missing.
- Electron smoke checklist created (26 manual steps across Dev Mode, Packaged Mode, Failure Mode, Cleanup).

## Notable Non-Changes

- Existing feature behavior intentionally preserved — no UI layout changes, no workflow redesigns.
- Python backend architecture (FastAPI + agents) unchanged; only error handling and edge cases hardened.
- SQLite schema unchanged; cascade delete implemented as a transaction, not a migration.
- 8 P2 items intentionally deferred to a future wave (error format unification, LLM health check optimization, citation graph concurrency cap, error message sanitization, streaming event loop blocking, model cache LRU, ConfigManager hardcoding, server-side history filtering). None are data-loss or security risks.

## Commit Summary

| Commit | Summary |
|---|---|
| `1844852` | Harden route validation (discovery, history, batch, config) and optimize batch query |
| `be113c2` | Verify Wave 5 P2 polish |
| `cc2fae3` | Update stress test for kbLoaded caching |
| `acb11a3` | Warn on partial citation graph load |
| `5fc8352` | Add skip button on Welcome research step |
| `c1eec76` | Distinguish sources undefined from empty in ChatMessage |
| `3a1028d` | Distinguish search error from no results in Discovery |
| `2c24253` | Add error feedback to QA, History, CitationNetwork |
| `1b6fc2a` | Add try/catch and loading state to Settings save handlers |
| `3c5aea3` | Add saving guard and try/catch to Discovery write actions |
| `b646ae1` | Add error state and try/catch on History delete |
| `9756d1d` | Add sendMessage timeout, duplicate guard, error paths to QA |
| `45fbc82` | Replace empty catches, add saving guard, cache KB list in knowledge store |
| `d99f1d0` | Add error and saving state to config store |
| `9678e8e` | Add optional AbortSignal to all request methods |
| `1c5a2c0` | Polish Python provider and config edge cases |
| `3af8350` | Harden file parsing and chunk boundaries |
| `58fbc8f` | Share analysis result normalization |
| `b856921` | Verify Wave 4 smoke and stress |
| `5fa8482` | Add mock core flow smoke coverage |
| `7d61dce` | Harden after-pack rcedit check and add Electron smoke checklist |
| `7c279e9` | Add bounded stress harness |
| `4931d88` | Add upload and history route coverage |
| `25386df` | Add smoke and stress script entrypoints |
| `4f9feda` | Add type declarations for react-markdown and remark-gfm |
| `ac46873` | Update test to expect ProviderError directly from call_llm |
| `8c71321` | Emit complete event after worker thread finishes |
| `48fa9c5` | Verify Wave 3 — all 16 P1 findings fixed |
| `53f2bfa` | Close SQLite storage on Electron app quit |
| `1aebdb7` | Preserve ProviderError type in call_llm |
