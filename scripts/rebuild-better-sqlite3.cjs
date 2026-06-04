const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const releaseDir = path.join(root, 'node_modules', 'better-sqlite3', 'build', 'Release')
const binding = path.join(releaseDir, 'better_sqlite3.node')
const backup = path.join(releaseDir, 'better_sqlite3.node.rebuild-bak')
const forgeMeta = path.join(releaseDir, '.forge-meta')
const electronRebuildCli = path.join(
  root,
  'node_modules',
  '@electron',
  'rebuild',
  'lib',
  'cli.js'
)

fs.mkdirSync(releaseDir, { recursive: true })

if (fs.existsSync(backup)) {
  try { fs.rmSync(backup, { force: true }) } catch { /* locked by previous run, ignore */ }
}

if (fs.existsSync(binding)) {
  fs.renameSync(binding, backup)
}

fs.rmSync(forgeMeta, { force: true })

const result = spawnSync(process.execPath, [electronRebuildCli, '-w', 'better-sqlite3'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
})

if (result.status === 0 && fs.existsSync(binding)) {
  try { fs.rmSync(backup, { force: true }) } catch { /* cleanup best-effort */ }
  process.exit(0)
}

if (fs.existsSync(backup) && !fs.existsSync(binding)) {
  fs.renameSync(backup, binding)
}

if (result.status === 0) {
  console.error('[rebuild-better-sqlite3] electron-rebuild exited successfully, but better_sqlite3.node was not produced.')
}

process.exit(result.status ?? 1)
