# Electron Desktop Smoke Checklist

Date: 2026-06-03

## Preconditions

- Node.js 20+ installed
- `npm install` completed at project root
- `npm run build:electron` completed at least once (or use dev mode steps)
- Windows OS (portable target); adapt paths for Mac/Linux
- No other Wonder instance running (single-instance lock will block)

## Dev Mode Smoke

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| D1 | Run `npm run dev:electron` | Electron window opens with dev server at `localhost:5173` | |
| D2 | Observe terminal output | `Wonder server running at http://127.0.0.1:<port>` appears | |
| D3 | Check window title bar | Custom frameless window renders with traffic-light controls | |
| D4 | Click minimize button (top-left) | Window minimizes to taskbar | |
| D5 | Click maximize/restore button (top-center) | Window toggles between maximized and restored state | |
| D6 | Click close button (top-right) | Window closes, Electron process exits | |
| D7 | Open Task Manager after close | No lingering `electron.exe` or `node.exe` processes from Wonder | |
| D8 | Navigate to `%APPDATA%/wonder/data` | Directory exists, contains `wonder.db` SQLite file | |
| D9 | Open DevTools (auto-opened in dev) | Console shows no unhandled errors on startup | |

## Packaged Mode Smoke

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| P1 | Run `npm run build:electron` | Build completes without errors, `.exe` created in `release/` | |
| P2 | Launch `release/Wonder.exe` | App starts, main window appears within 15 seconds | |
| P3 | Check `%APPDATA%/wonder/static` | Renderer assets extracted, `.version` file matches app version | |
| P4 | Check `%APPDATA%/wonder/data` | Directory created, `wonder.db` present | |
| P5 | Perform minimize/maximize/close (D3-D6) | Same behavior as dev mode | |
| P6 | Close and relaunch within 5 seconds | Second instance shows focus to existing window, no crash | |
| P7 | Open Task Manager after close | No lingering processes | |
| P8 | Verify window loads renderer | UI renders (not blank white/gray screen) | |
| P9 | Check `%APPDATA%/wonder/static/.version` on relaunch | Static assets NOT re-extracted (version matches, skip copy) | |

## Failure Mode Smoke

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| F1 | Rename `dist-server/server/index.js` to `index.js.bak`, launch packaged app | Error dialog: "Wonder 启动失败 — 服务器启动失败: ..." appears, app quits cleanly | |
| F2 | Restore the file, set `PORT` env to an occupied port, launch | App finds a free port automatically (uses port 0) | |
| F3 | Temporarily add `await new Promise(r => setTimeout(r, 20000))` to server init, launch | Error dialog: "服务器未在规定时间内就绪" appears after ~15 seconds, app quits | |
| F4 | Delete `%APPDATA%/wonder/data/wonder.db`, launch | App recreates DB on startup, no crash | |
| F5 | Delete `%APPDATA%/wonder/static` directory, launch | App re-extracts renderer assets, UI loads normally | |
| F6 | Corrupt `wonder.db` (write garbage bytes), launch | App handles gracefully or shows meaningful error (not silent crash) | |

## Cleanup Checks

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| C1 | Launch app, use for 1 minute, close via window close button | `before-quit` handler fires, `app.exit(0)` called, process terminates | |
| C2 | Check Task Manager 3 seconds after close | No `electron.exe`, `node.exe`, or `wonder` processes remain | |
| C3 | Check `%APPDATA%/wonder/data/wonder.db` file size | Non-zero, not corrupted (openable with `sqlite3` CLI) | |
| C4 | Launch a second copy while first is running | Second instance exits immediately, first instance receives focus | |
| C5 | Run `after-pack.js` without `electron-winstaller` installed (`npm remove electron-winstaller --save-dev` then build) | Build fails with clear message: "Missing rcedit ... Install electron-winstaller as a devDependency" | |
| C6 | Restore `electron-winstaller`, rebuild | Build succeeds, version info embedded in `.exe` (right-click > Properties > Details) | |

## Notes

- Steps F1-F3 are destructive to the build output — run them against a copy or rebuild afterward.
- Steps F4-F6 modify user data — use a test profile or back up `%APPDATA%/wonder` first.
- All checks are manual; no automation framework is wired for Electron smoke tests in this project.
- The `before-quit` handler currently calls `app.exit(0)` because `server/index.ts` does not export a close function. SQLite cleanup is not guaranteed until that export is added.
