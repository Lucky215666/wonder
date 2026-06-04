const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const target = process.argv[2] || 'portable'
const isWin = process.platform === 'win32'
const npmCmd = isWin ? 'npm.cmd' : 'npm'
const npxCmd = isWin ? 'npx.cmd' : 'npx'
const sqliteBinding = path.join(root, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin && (command.endsWith('.cmd') || command.endsWith('.bat')),
    ...options,
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function assertSqliteBindingCanMove() {
  if (!fs.existsSync(sqliteBinding)) return

  const probe = `${sqliteBinding}.lock-probe`
  try {
    if (fs.existsSync(probe)) fs.rmSync(probe, { force: true })
    fs.renameSync(sqliteBinding, probe)
    fs.renameSync(probe, sqliteBinding)
  } catch (error) {
    console.error('\n[build-electron] better-sqlite3 native module is locked.')
    console.error(`File: ${sqliteBinding}`)
    console.error('Close any running Wonder, Electron, or Node dev server windows, then run the build again.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

function assertSqliteBindingExists() {
  if (!fs.existsSync(sqliteBinding)) {
    console.error('\n[build-electron] better-sqlite3 rebuild did not produce better_sqlite3.node.')
    console.error(`Expected: ${sqliteBinding}`)
    process.exit(1)
  }
}

if (!['portable', 'nsis', 'dir'].includes(target)) {
  console.error(`[build-electron] Unsupported target "${target}". Use portable, nsis, or dir.`)
  process.exit(1)
}

assertSqliteBindingCanMove()

run(npxCmd, ['tsc', '-p', 'tsconfig.electron.json'])
run(npmCmd, ['run', 'build:server'])
run(npxCmd, ['vite', 'build'])
run(npmCmd, ['run', 'rebuild:electron'])
assertSqliteBindingExists()
run(npxCmd, ['electron-builder', '--win', target])

console.log(`\n[build-electron] Windows ${target} build complete.`)
