import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export interface DocumentRow {
  id: string
  file_name: string
  file_path: string | null
  file_type: string | null
  created_at: string
  summary: string | null
  reading_card: string | null
  relation_analysis: string | null
  writing_materials: string | null
  todo_list: string | null
  tags: string | null
  match_score: number | null
}

export interface ChunkRow {
  id: string
  document_id: string
  content: string
  embedding: Buffer | null
  chunk_index: number
}

export interface HistoryRow {
  id: string
  document_id: string | null
  created_at: string
  result: string
}

export class StorageService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  static create(dataDir: string): StorageService {
    fs.mkdirSync(dataDir, { recursive: true })
    const dbPath = path.join(dataDir, 'wonder.db')
    const db = new Database(dbPath)
    const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8')
    db.exec(schema)
    return new StorageService(db)
  }

  upsertDocument(doc: {
    id: string; fileName: string; filePath?: string | null; fileType?: string;
    summary?: string; readingCard?: string; relationAnalysis?: string;
    writingMaterials?: string; todoList?: string; tags?: string; matchScore?: number
  }) {
    this.db.prepare(`
      INSERT INTO documents (id, file_name, file_path, file_type, summary, reading_card, relation_analysis, writing_materials, todo_list, tags, match_score)
      VALUES (@id, @fileName, @filePath, @fileType, @summary, @readingCard, @relationAnalysis, @writingMaterials, @todoList, @tags, @matchScore)
      ON CONFLICT(id) DO UPDATE SET
        file_name=excluded.file_name, file_path=excluded.file_path, file_type=excluded.file_type,
        summary=excluded.summary, reading_card=excluded.reading_card, relation_analysis=excluded.relation_analysis,
        writing_materials=excluded.writing_materials, todo_list=excluded.todo_list, tags=excluded.tags,
        match_score=excluded.match_score
    `).run({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath ?? null,
      fileType: doc.fileType ?? null,
      summary: doc.summary ?? null,
      readingCard: doc.readingCard ?? null,
      relationAnalysis: doc.relationAnalysis ?? null,
      writingMaterials: doc.writingMaterials ?? null,
      todoList: doc.todoList ?? null,
      tags: doc.tags ?? null,
      matchScore: doc.matchScore ?? null,
    })
  }

  getDocument(id: string): DocumentRow | null {
    return (this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow) ?? null
  }

  listDocuments(): DocumentRow[] {
    return this.db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as DocumentRow[]
  }

  deleteDocument(id: string) {
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id)
  }

  insertChunk(chunk: { id: string; documentId: string; content: string; embedding?: Buffer; chunkIndex: number }) {
    this.db.prepare('INSERT INTO chunks (id, document_id, content, embedding, chunk_index) VALUES (?, ?, ?, ?, ?)')
      .run(chunk.id, chunk.documentId, chunk.content, chunk.embedding ?? null, chunk.chunkIndex)
  }

  getChunksByDocument(documentId: string): ChunkRow[] {
    return this.db.prepare('SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index').all(documentId) as ChunkRow[]
  }

  getAllChunksWithEmbedding(): ChunkRow[] {
    return this.db.prepare('SELECT * FROM chunks WHERE embedding IS NOT NULL').all() as ChunkRow[]
  }

  deleteChunksByDocument(documentId: string) {
    this.db.prepare('DELETE FROM chunks WHERE document_id = ?').run(documentId)
  }

  setConfig(key: string, value: string) {
    this.db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .run(key, value)
  }

  getConfig(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | null
    return row?.value ?? null
  }

  getAllConfig(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  }

  addHistory(entry: { id: string; documentId?: string; result: string }) {
    this.db.prepare('INSERT INTO analysis_history (id, document_id, result) VALUES (?, ?, ?)')
      .run(entry.id, entry.documentId ?? null, entry.result)
  }

  getHistory(id: string): HistoryRow | null {
    return this.db.prepare('SELECT * FROM analysis_history WHERE id = ?').get(id) as HistoryRow | null
  }

  listHistory(limit = 50): HistoryRow[] {
    return this.db.prepare('SELECT * FROM analysis_history ORDER BY created_at DESC LIMIT ?').all(limit) as HistoryRow[]
  }

  close() {
    this.db.close()
  }
}
