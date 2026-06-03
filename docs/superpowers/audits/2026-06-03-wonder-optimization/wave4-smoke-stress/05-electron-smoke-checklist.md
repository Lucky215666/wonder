# Electron Smoke Checklist Report

Date: 2026-06-03

## Checklist Created

Path: `docs/superpowers/audits/2026-06-03-wonder-optimization/wave4-smoke-stress/electron-smoke-checklist.md`

## Scope

Covers four categories across 26 test steps:

- **Dev Mode (D1-D9)**: Startup, window controls, process cleanup, SQLite init
- **Packaged Mode (P1-P9)**: Portable build launch, static asset extraction, single-instance lock, re-extraction skip
- **Failure Mode (F1-F6)**: Missing server module, timeout dialog, DB corruption, missing static assets
- **Cleanup (C1-C6)**: Process termination, before-quit hook, after-pack dependency guard

## Manual-Only Checks

All 26 steps require manual execution. The project has no Electron automation framework (e.g. Spectron, Playwright Electron mode, or WebDriverIO). Steps involving Task Manager inspection, dialog verification, and `.exe` property inspection cannot be scripted without additional tooling.

## Wave 3 Failure Modes Included

| Wave 3 Issue | Checklist Step |
|---|---|
| Silent startup failure (server require crash) | F1 |
| Server timeout with no user feedback | F3 |
| Missing SQLite close on shutdown | C1, C2 |
| after-pack.js assumes rcedit exists | C5, C6 |
| Stale static assets after update | P9, F5 |

## Known Gaps

- No macOS or Linux smoke steps (build targets exist but are untested here).
- No network proxy/firewall interference tests.
- No multi-monitor or DPI scaling checks.
- SQLite close path is not testable until `server/index.ts` exports a cleanup function.
