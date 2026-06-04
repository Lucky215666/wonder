import { create } from 'zustand'
import { api } from '../services/api'

type AnswerMode = 'general' | 'rag_enhanced' | 'mentioned_docs' | 'compare_docs'

interface QASources {
  docIds: string[]
  chunks: string[]
  refs?: Array<{
    doc_id: string
    file_name: string
    chunk_id?: string | null
    chunk_index?: number | null
    chunk_type: 'summary' | 'content'
    content: string
    score?: number | null
  }>
  answerMode?: AnswerMode
}

interface QAMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: QASources
  created_at?: string
}

export interface MentionedDoc {
  id: string
  fileName: string
}

interface QASessionSummary {
  id: string
  title: string
  scope_type: string
  scope_ids: string
  updated_at: string
}

interface QAState {
  // Session list
  sessions: QASessionSummary[]
  sessionsLoading: boolean
  sessionsError: string | null

  // Current session
  sessionId: string | null
  sessionScope: { type: string; ids: string[] }
  messages: QAMessage[]
  loading: boolean
  saving: boolean

  // @ mentions
  mentionedDocs: MentionedDoc[]
  mentionSearchResults: MentionedDoc[]
  mentionSearchLoading: boolean
  searchMentions: (query: string) => Promise<void>
  addMention: (doc: MentionedDoc) => void
  removeMention: (docId: string) => void
  clearMentions: () => void

  // Actions
  loadSessions: () => Promise<void>
  createSession: (title: string, scopeType: string, scopeIds: string[]) => Promise<string>
  openSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  sendMessage: (question: string, mentionedDocIds?: string[]) => Promise<void>
  clear: () => void
}

export const useQAStore = create<QAState>((set, get) => ({
  sessions: [],
  sessionsLoading: false,
  sessionsError: null,
  sessionId: null,
  sessionScope: { type: 'all', ids: [] },
  messages: [],
  loading: false,
  saving: false,
  mentionedDocs: [],
  mentionSearchResults: [],
  mentionSearchLoading: false,

  searchMentions: async (query) => {
    if (!query.trim()) {
      set({ mentionSearchResults: [], mentionSearchLoading: false })
      return
    }
    set({ mentionSearchLoading: true })
    try {
      const docs = await api.get<Array<{ id: string; file_name: string | null }>>('/api/knowledge/documents')
      const q = query.toLowerCase()
      const results = docs
        .filter(d => d.file_name && d.file_name.toLowerCase().includes(q))
        .map(d => ({ id: d.id, fileName: d.file_name! }))
      set({ mentionSearchResults: results, mentionSearchLoading: false })
    } catch {
      set({ mentionSearchResults: [], mentionSearchLoading: false })
    }
  },

  addMention: (doc) => {
    set(state => {
      if (state.mentionedDocs.some(d => d.id === doc.id)) return state
      return { mentionedDocs: [...state.mentionedDocs, doc] }
    })
  },

  removeMention: (docId) => {
    set(state => ({
      mentionedDocs: state.mentionedDocs.filter(d => d.id !== docId),
    }))
  },

  clearMentions: () => set({ mentionedDocs: [], mentionSearchResults: [] }),

  loadSessions: async () => {
    set({ sessionsLoading: true, sessionsError: null })
    try {
      const sessions = await api.get<QASessionSummary[]>('/api/qa/sessions')
      set({ sessions, sessionsLoading: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ sessionsLoading: false, sessionsError: msg })
    }
  },

  createSession: async (title, scopeType, scopeIds) => {
    try {
      const session = await api.post<QASessionSummary & { id: string }>('/api/qa/sessions', {
        title,
        scopeType,
        scopeIds,
      })
      set(state => ({
        sessions: [session, ...state.sessions],
        sessionId: session.id,
        sessionScope: { type: scopeType, ids: scopeIds },
        messages: [],
      }))
      return session.id
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ sessionsError: msg })
      throw err
    }
  },

  openSession: async (id) => {
    try {
      const data = await api.get<QASessionSummary & { messages: QAMessage[] }>(`/api/qa/sessions/${id}`)
      set({
        sessionId: data.id,
        sessionScope: { type: data.scope_type, ids: JSON.parse(data.scope_ids) },
        messages: data.messages.map(m => ({
          ...m,
          sources: m.sources ? (typeof m.sources === 'string' ? JSON.parse(m.sources) : m.sources) : undefined,
        })),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ sessionsError: msg })
      throw err
    }
  },

  deleteSession: async (id) => {
    try {
      await api.delete(`/api/qa/sessions/${id}`)
      set(state => {
        const sessions = state.sessions.filter(s => s.id !== id)
        const isCurrent = state.sessionId === id
        return {
          sessions,
          ...(isCurrent ? { sessionId: null, messages: [], sessionScope: { type: 'all', ids: [] } } : {}),
        }
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ sessionsError: msg })
      throw err
    }
  },

  sendMessage: async (question, mentionedDocIds?) => {
    const { sessionId } = get()
    if (!sessionId) return
    if (get().loading) return

    set(state => ({
      messages: [...state.messages, { id: `tmp-${Date.now()}`, role: 'user', content: question }],
      loading: true,
    }))

    try {
      const signal = AbortSignal.timeout(60000)
      const res = await api.post<{
        userMessage: QAMessage
        assistantMessage: QAMessage
      }>(`/api/qa/sessions/${sessionId}/messages`, { question, mentionedDocIds }, signal)

      set(state => {
        const msgs = state.messages.slice(0, -1)
        return {
          messages: [...msgs, res.userMessage, res.assistantMessage],
          loading: false,
        }
      })
      // Clear mentions after successful send
      get().clearMentions()
    } catch (err) {
      const errorMsg = err instanceof Error
        ? (err.name === 'AbortError' ? '请求超时，请稍后重试' : err.message)
        : '请求失败'
      set(state => ({
        loading: false,
        messages: state.messages.filter(m => !m.id.startsWith('tmp-')),
      }))
      // Keep mentions on failure (don't clear)
      throw new Error(errorMsg)
    }
  },

  clear: () => set({ sessionId: null, sessionScope: { type: 'all', ids: [] }, messages: [], mentionedDocs: [] }),
}))
