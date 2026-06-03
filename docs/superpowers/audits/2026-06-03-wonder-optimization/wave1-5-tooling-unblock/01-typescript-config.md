# TypeScript Config Unblock

Date: 2026-06-03

## Change

Added `"ignoreDeprecations": "6.0"` inside `compilerOptions` in `tsconfig.json` to suppress TS5101 (`baseUrl` deprecation warning in TypeScript 6.x).

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` (before) | TS5101 on `tsconfig.json` line 18 | `baseUrl` deprecated |
| `node -e "JSON.parse(...)"` | tsconfig.json ok | JSON valid |
| `npm run typecheck` (after) | TS5101 resolved; 15 unrelated source errors remain | See below |

## Remaining Issues

TS5101 is fully resolved. The following pre-existing source-level type errors remain (not related to tsconfig):

- `src/pages/Discovery.tsx:313` — `selected.influentialCitationCount` possibly undefined
- `src/pages/Knowledge.tsx:279` — `reading_card` property missing on type
- `src/pages/Settings.tsx:72-79` — multiple properties missing on `NormalizedAppConfig`
- `src/pages/Settings.tsx:139` — `AppConfig` not assignable to `NormalizedAppConfig`
- `src/pages/Welcome.tsx:78` — properties missing on `NormalizedAppConfig`
- `src/pages/Welcome.tsx:140` — `AppConfig` not assignable to `NormalizedAppConfig`

These are application-level type mismatches, not tooling config issues.
