import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { StorageService } from '../server/services/storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function migrateFromJson(dataDir: string, outputDb: string) {
  // note-forge stores history in "outputs/" as "{id}_record.json"
  const outputsDir = path.join(dataDir, 'outputs')
  if (!fs.existsSync(outputsDir)) {
    console.log('No outputs directory found, skipping JSON migration')
    return
  }

  const db = new Database(outputDb)
  // Initialize schema
  const schema = fs.readFileSync(path.join(__dirname, '../server/db/schema.sql'), 'utf-8')
  db.exec(schema)
  const storage = new StorageService(db)

  const files = fs.readdirSync(outputsDir).filter(f => f.endsWith('_record.json'))
  console.log(`Found ${files.length} history files to migrate`)

  let success = 0
  let failed = 0

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(outputsDir, file), 'utf-8')
      const data = JSON.parse(content)
      const id = data.id || file.replace('_record.json', '')
      storage.addHistory({
        id,
        result: JSON.stringify(data),
      })
      console.log(`  Migrated: ${file} (id: ${id})`)
      success++
    } catch (e) {
      console.error(`  Failed: ${file}`, e)
      failed++
    }
  }

  db.close()
  console.log(`Migration complete: ${success} succeeded, ${failed} failed`)
}

const dataDir = process.argv[2] || './data'
const outputDb = process.argv[3] || './data/wonder.db'
migrateFromJson(dataDir, outputDb)
