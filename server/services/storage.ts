import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

// ── Interfaces ──────────────────────────────────────────────────────────

export interface DocumentRow {
  id: string
  file_name: string | null
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
  chunk_index: number
  content: string
  embedding: Buffer | null
}

export interface HistoryRow {
  id: string
  document_id: string | null
  created_at: string
  result: string
}

export interface KnowledgeBaseRow {
  id: string
  name: string
  description: string | null
  readme: string
  created_at: string
  updated_at: string
}

export interface DocumentKBRow {
  document_id: string
  knowledge_base_id: string
  sub_direction: string | null
  tags: string | null
  fit_score: number | null
  recommended_action: string | null
  created_at: string
}

export interface ReadmeSuggestionRow {
  id: string
  knowledge_base_id: string
  document_id: string | null
  section: string
  suggestion: string
  reason: string | null
  status: string
  created_at: string
}

// ── StorageService ──────────────────────────────────────────────────────

export class StorageService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  static create(dataDir: string): StorageService {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    const dbPath = path.join(dataDir, 'wonder.db')
    const db = new Database(dbPath)
    const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8')
    db.exec(schema)
    return new StorageService(db)
  }

  // ── Document CRUD ───────────────────────────────────────────────────

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
        summary=COALESCE(excluded.summary, summary), reading_card=COALESCE(excluded.reading_card, reading_card),
        relation_analysis=COALESCE(excluded.relation_analysis, relation_analysis),
        writing_materials=COALESCE(excluded.writing_materials, writing_materials),
        todo_list=COALESCE(excluded.todo_list, todo_list), tags=COALESCE(excluded.tags, tags),
        match_score=COALESCE(excluded.match_score, match_score)
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

  getDocument(id: string): DocumentRow | undefined {
    return this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined
  }

  listDocuments(): DocumentRow[] {
    return this.db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as DocumentRow[]
  }

  deleteDocument(id: string) {
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id)
  }

  // ── Chunk methods ───────────────────────────────────────────────────

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

  // ── Config methods ──────────────────────────────────────────────────

  setConfig(key: string, value: string) {
    this.db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .run(key, value)
  }

  getConfig(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value
  }

  getAllConfig(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  }

  // ── History methods ─────────────────────────────────────────────────

  addHistory(entry: { id: string; documentId?: string; result: string }) {
    this.db.prepare('INSERT INTO analysis_history (id, document_id, result) VALUES (?, ?, ?)')
      .run(entry.id, entry.documentId ?? null, entry.result)
  }

  getHistory(id: string): HistoryRow | undefined {
    return this.db.prepare('SELECT * FROM analysis_history WHERE id = ?').get(id) as HistoryRow | undefined
  }

  listHistory(limit = 50): HistoryRow[] {
    return this.db.prepare('SELECT * FROM analysis_history ORDER BY created_at DESC LIMIT ?').all(limit) as HistoryRow[]
  }

  // ── Knowledge Base methods ──────────────────────────────────────────

  createKnowledgeBase(kb: { id: string; name: string; description?: string; readme?: string }) {
    this.db.prepare('INSERT INTO knowledge_bases (id, name, description, readme) VALUES (?, ?, ?, ?)')
      .run(kb.id, kb.name, kb.description ?? null, kb.readme ?? '')
  }

  getKnowledgeBase(id: string): KnowledgeBaseRow | undefined {
    return this.db.prepare('SELECT * FROM knowledge_bases WHERE id = ?').get(id) as KnowledgeBaseRow | undefined
  }

  listKnowledgeBases(): KnowledgeBaseRow[] {
    return this.db.prepare('SELECT * FROM knowledge_bases ORDER BY created_at DESC').all() as KnowledgeBaseRow[]
  }

  updateKnowledgeBase(id: string, updates: { name?: string; description?: string; readme?: string }) {
    const fields: string[] = []
    const values: unknown[] = []
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
    if (updates.readme !== undefined) { fields.push('readme = ?'); values.push(updates.readme) }
    if (fields.length === 0) return
    fields.push("updated_at = datetime('now')")
    values.push(id)
    this.db.prepare(`UPDATE knowledge_bases SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  deleteKnowledgeBase(id: string) {
    this.db.prepare('DELETE FROM knowledge_bases WHERE id = ?').run(id)
  }

  // ── Document-KB methods ─────────────────────────────────────────────

  addDocumentToKB(assoc: { documentId: string; knowledgeBaseId: string; subDirection?: string; tags?: string; fitScore?: number; recommendedAction?: string }) {
    this.db.prepare(`
      INSERT INTO document_knowledge_bases (document_id, knowledge_base_id, sub_direction, tags, fit_score, recommended_action)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(document_id, knowledge_base_id) DO UPDATE SET
        sub_direction=COALESCE(excluded.sub_direction, sub_direction), tags=COALESCE(excluded.tags, tags),
        fit_score=COALESCE(excluded.fit_score, fit_score), recommended_action=COALESCE(excluded.recommended_action, recommended_action)
    `).run(assoc.documentId, assoc.knowledgeBaseId, assoc.subDirection ?? null, assoc.tags ?? null, assoc.fitScore ?? null, assoc.recommendedAction ?? null)
  }

  removeDocumentFromKB(documentId: string, knowledgeBaseId: string) {
    this.db.prepare('DELETE FROM document_knowledge_bases WHERE document_id = ? AND knowledge_base_id = ?').run(documentId, knowledgeBaseId)
  }

  getDocumentsByKB(knowledgeBaseId: string): (DocumentRow & {
    kb_tags: string | null
    fit_score: number | null
    recommended_action: string | null
  })[] {
    return this.db.prepare(`
      SELECT d.*,
        dkb.tags AS kb_tags,
        dkb.fit_score,
        dkb.recommended_action
      FROM documents d
      INNER JOIN document_knowledge_bases dkb ON d.id = dkb.document_id
      WHERE dkb.knowledge_base_id = ?
      ORDER BY d.created_at DESC
    `).all(knowledgeBaseId) as (DocumentRow & {
      kb_tags: string | null
      fit_score: number | null
      recommended_action: string | null
    })[]
  }

  getKBsForDocument(documentId: string): KnowledgeBaseRow[] {
    return this.db.prepare(`
      SELECT kb.*
      FROM knowledge_bases kb
      INNER JOIN document_knowledge_bases dkb ON kb.id = dkb.knowledge_base_id
      WHERE dkb.document_id = ?
      ORDER BY kb.created_at DESC
    `).all(documentId) as KnowledgeBaseRow[]
  }

  getDocumentKBCount(knowledgeBaseId: string): number {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM document_knowledge_bases WHERE knowledge_base_id = ?')
      .get(knowledgeBaseId) as { count: number }
    return row.count
  }

  getKBTags(knowledgeBaseId: string): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT tags FROM document_knowledge_bases
      WHERE knowledge_base_id = ? AND tags IS NOT NULL
    `).all(knowledgeBaseId) as { tags: string }[]
    const tagSet = new Set<string>()
    for (const row of rows) {
      for (const tag of row.tags.split(',')) {
        const t = tag.trim()
        if (t) tagSet.add(t)
      }
    }
    return Array.from(tagSet)
  }

  getPendingSuggestionCount(knowledgeBaseId: string): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS count FROM readme_suggestions
      WHERE knowledge_base_id = ? AND status = 'pending'
    `).get(knowledgeBaseId) as { count: number }
    return row.count
  }

  // ── README suggestion methods ───────────────────────────────────────

  addReadmeSuggestion(suggestion: { id: string; knowledgeBaseId: string; documentId: string; section: string; suggestion: string; reason?: string }) {
    this.db.prepare(`
      INSERT INTO readme_suggestions (id, knowledge_base_id, document_id, section, suggestion, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(suggestion.id, suggestion.knowledgeBaseId, suggestion.documentId, suggestion.section, suggestion.suggestion, suggestion.reason ?? null)
  }

  getReadmeSuggestions(knowledgeBaseId: string, status?: string): ReadmeSuggestionRow[] {
    if (status) {
      return this.db.prepare('SELECT * FROM readme_suggestions WHERE knowledge_base_id = ? AND status = ? ORDER BY created_at DESC')
        .all(knowledgeBaseId, status) as ReadmeSuggestionRow[]
    }
    return this.db.prepare('SELECT * FROM readme_suggestions WHERE knowledge_base_id = ? ORDER BY created_at DESC')
      .all(knowledgeBaseId) as ReadmeSuggestionRow[]
  }

  updateReadmeSuggestionStatus(id: string, status: string) {
    this.db.prepare('UPDATE readme_suggestions SET status = ? WHERE id = ?').run(status, id)
  }

  // ── KB-scoped chunks ───────────────────────────────────────────────

  getChunksByKB(knowledgeBaseId: string): ChunkRow[] {
    return this.db.prepare(`
      SELECT c.* FROM chunks c
      INNER JOIN document_knowledge_bases dkb ON c.document_id = dkb.document_id
      WHERE dkb.knowledge_base_id = ?
      ORDER BY c.document_id, c.chunk_index
    `).all(knowledgeBaseId) as ChunkRow[]
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  close() {
    this.db.close()
  }
}
