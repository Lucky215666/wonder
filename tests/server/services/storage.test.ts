import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { StorageService } from '../../../server/services/storage'
import fs from 'fs'
import path from 'path'

const TEST_DB = path.join(__dirname, 'test.db')

describe('StorageService', () => {
  let db: Database.Database
  let storage: StorageService

  beforeEach(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
    db = new Database(TEST_DB)
    const schema = fs.readFileSync(path.join(__dirname, '../../../server/db/schema.sql'), 'utf-8')
    db.exec(schema)
    storage = new StorageService(db)
  })

  afterEach(() => {
    db.close()
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
  })

  it('should insert and retrieve a document', () => {
    storage.upsertDocument({ id: 'doc1', fileName: 'test.pdf', fileType: 'pdf' })
    const doc = storage.getDocument('doc1')
    expect(doc).toBeDefined()
    expect(doc!.file_name).toBe('test.pdf')
  })

  it('should list all documents', () => {
    storage.upsertDocument({ id: 'doc1', fileName: 'a.pdf', fileType: 'pdf' })
    storage.upsertDocument({ id: 'doc2', fileName: 'b.pdf', fileType: 'pdf' })
    const docs = storage.listDocuments()
    expect(docs).toHaveLength(2)
  })

  it('should delete a document and its chunks', () => {
    storage.upsertDocument({ id: 'doc1', fileName: 'a.pdf', fileType: 'pdf' })
    storage.insertChunk({ id: 'c1', documentId: 'doc1', content: 'hello', chunkIndex: 0 })
    storage.deleteDocument('doc1')
    expect(storage.getDocument('doc1')).toBeFalsy()
    expect(storage.getChunksByDocument('doc1')).toHaveLength(0)
  })

  it('should save and retrieve config', () => {
    storage.setConfig('apiKey', 'sk-123')
    expect(storage.getConfig('apiKey')).toBe('sk-123')
  })

  it('should insert and list analysis history', () => {
    storage.addHistory({ id: 'h1', result: '{"summary":"test"}' })
    storage.addHistory({ id: 'h2', result: '{"summary":"test2"}' })
    const history = storage.listHistory()
    expect(history).toHaveLength(2)
  })
})
