import { defineStore } from 'pinia'
import {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  askQuestion,
  searchKnowledge,
  type KnowledgeDoc,
  type KnowledgeDocDetail,
  type KnowledgeSearchResult,
  type KnowledgeQAResponse,
} from '@/lib/api/knowledge'

export const useKnowledgeStore = defineStore('knowledge', {
  state: () => ({
    documents: [] as KnowledgeDoc[],
    total: 0,
    loading: false,
    uploading: false,
    error: '',
    // Detail view
    detailLoading: false,
    currentDetail: null as KnowledgeDocDetail | null,
    // Search
    searchQuery: '',
    searchResults: [] as KnowledgeSearchResult[],
    searching: false,
    // QA
    qaAnswer: null as KnowledgeQAResponse | null,
    qaLoading: false,
  }),

  actions: {
    async loadDocuments() {
      this.loading = true
      this.error = ''
      try {
        const res = await listDocuments()
        this.documents = res.documents
        this.total = res.total
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.loading = false
      }
    },

    async upload(file: File) {
      this.uploading = true
      this.error = ''
      try {
        await uploadDocument(file)
        await this.loadDocuments()
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        throw e
      } finally {
        this.uploading = false
      }
    },

    async remove(docId: string) {
      try {
        await deleteDocument(docId)
        this.documents = this.documents.filter(d => d.id !== docId)
        this.total--
        if (this.currentDetail?.id === docId) this.currentDetail = null
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      }
    },

    async loadDetail(docId: string) {
      this.detailLoading = true
      try {
        this.currentDetail = await getDocument(docId)
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.detailLoading = false
      }
    },

    async search(query: string, docIds?: string[]) {
      if (!query.trim()) return
      this.searching = true
      this.searchQuery = query
      try {
        const res = await searchKnowledge(query, docIds)
        this.searchResults = res.results
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.searching = false
      }
    },

    async ask(question: string, docIds?: string[]) {
      this.qaLoading = true
      this.qaAnswer = null
      try {
        this.qaAnswer = await askQuestion(question, docIds)
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.qaLoading = false
      }
    },
  },
})
