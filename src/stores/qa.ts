import { create } from 'zustand'
import { api } from '../services/api'

interface QASources {
  docIds: string[]
  chunks: string[]
}

interface QAMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: QASources
  created_at?: string
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

  // Current session
  sessionId: string | null
  sessionScope: { type: string; ids: string[] }
  messages: QAMessage[]
  loading: boolean

  // Actions
  loadSessions: () => Promise<void>
  createSession: (title: string, scopeType: string, scopeIds: string[]) => Promise<string>
  openSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  sendMessage: (question: string) => Promise<void>
  clear: () => void
}

export const useQAStore = create<QAState>((set, get) => ({
  sessions: [],
  sessionsLoading: false,
  sessionId: null,
  sessionScope: { type: 'all', ids: [] },
  messages: [],
  loading: false,

  loadSessions: async () => {
    set({ sessionsLoading: true })
    try {
      const sessions = await api.get<QASessionSummary[]>('/api/qa/sessions')
      set({ sessions, sessionsLoading: false })
    } catch {
      set({ sessionsLoading: false })
    }
  },

  createSession: async (title, scopeType, scopeIds) => {
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
  },

  openSession: async (id) => {
    const data = await api.get<QASessionSummary & { messages: QAMessage[] }>(`/api/qa/sessions/${id}`)
    set({
      sessionId: data.id,
      sessionScope: { type: data.scope_type, ids: JSON.parse(data.scope_ids) },
      messages: data.messages.map(m => ({
        ...m,
        sources: m.sources ? (typeof m.sources === 'string' ? JSON.parse(m.sources) : m.sources) : undefined,
      })),
    })
  },

  deleteSession: async (id) => {
    await api.delete(`/api/qa/sessions/${id}`)
    set(state => {
      const sessions = state.sessions.filter(s => s.id !== id)
      const isCurrent = state.sessionId === id
      return {
        sessions,
        ...(isCurrent ? { sessionId: null, messages: [], sessionScope: { type: 'all', ids: [] } } : {}),
      }
    })
  },

  sendMessage: async (question) => {
    const { sessionId } = get()
    if (!sessionId) return

    set(state => ({
      messages: [...state.messages, { id: `tmp-${Date.now()}`, role: 'user', content: question }],
      loading: true,
    }))

    try {
      const res = await api.post<{
        userMessage: QAMessage
        assistantMessage: QAMessage
      }>(`/api/qa/sessions/${sessionId}/messages`, { question })

      set(state => {
        // Replace the temp user message with the real one, then add assistant
        const msgs = state.messages.slice(0, -1) // remove temp
        return {
          messages: [...msgs, res.userMessage, res.assistantMessage],
          loading: false,
        }
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '请求失败'
      set(state => ({
        loading: false,
        // Remove temp user message on error
        messages: state.messages.filter(m => !m.id.startsWith('tmp-')),
      }))
      throw new Error(errorMsg)
    }
  },

  clear: () => set({ sessionId: null, sessionScope: { type: 'all', ids: [] }, messages: [] }),
}))
