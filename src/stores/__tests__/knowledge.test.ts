import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { useKnowledgeStore } from '../knowledge'
import { api } from '../../services/api'

const mockApi = vi.mocked(api)

describe('useKnowledgeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useKnowledgeStore.setState({
      documents: [],
      loading: false,
      kbDocuments: [],
      kbDocsLoading: false,
      error: null,
      kbLoaded: false,
      saving: false,
      knowledgeBases: [],
    })
  })

  it('resets legacy document loading when loadDocuments fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network down'))

    await expect(useKnowledgeStore.getState().loadDocuments()).resolves.toBeUndefined()

    expect(useKnowledgeStore.getState().loading).toBe(false)
    expect(useKnowledgeStore.getState().documents).toEqual([])
  })

  it('resets kb document loading and sets error when loadKBDocuments fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network down'))

    await expect(useKnowledgeStore.getState().loadKBDocuments('kb-1')).resolves.toBeUndefined()

    expect(useKnowledgeStore.getState().kbDocsLoading).toBe(false)
    expect(useKnowledgeStore.getState().kbDocuments).toEqual([])
    expect(useKnowledgeStore.getState().error).toBe('network down')
  })

  it('sets error when loadKnowledgeBases fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('server down'))

    await useKnowledgeStore.getState().loadKnowledgeBases()

    expect(useKnowledgeStore.getState().kbLoading).toBe(false)
    expect(useKnowledgeStore.getState().error).toBe('server down')
  })

  it('sets error and rethrows when createKnowledgeBase fails', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('duplicate name'))

    await expect(useKnowledgeStore.getState().createKnowledgeBase('dup')).rejects.toThrow('duplicate name')

    expect(useKnowledgeStore.getState().error).toBe('duplicate name')
  })

  it('sets error and rethrows when updateKnowledgeBase fails', async () => {
    mockApi.patch.mockRejectedValueOnce(new Error('not found'))

    await expect(useKnowledgeStore.getState().updateKnowledgeBase('bad-id', { name: 'x' })).rejects.toThrow('not found')

    expect(useKnowledgeStore.getState().error).toBe('not found')
  })

  it('sets error when loadReadmeSuggestions fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('timeout'))

    await useKnowledgeStore.getState().loadReadmeSuggestions('kb-1')

    expect(useKnowledgeStore.getState().error).toBe('timeout')
  })

  it('sets error and rethrows when deleteKnowledgeBase fails', async () => {
    mockApi.delete.mockRejectedValueOnce(new Error('not found'))

    await expect(useKnowledgeStore.getState().deleteKnowledgeBase('bad-id')).rejects.toThrow('not found')

    expect(useKnowledgeStore.getState().error).toBe('not found')
    expect(useKnowledgeStore.getState().saving).toBe(false)
  })

  it('sets error when loadDocuments fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('server down'))

    await useKnowledgeStore.getState().loadDocuments()

    expect(useKnowledgeStore.getState().loading).toBe(false)
    expect(useKnowledgeStore.getState().documents).toEqual([])
    expect(useKnowledgeStore.getState().error).toBe('server down')
  })

  describe('kbLoaded caching', () => {
    it('skips API call when kbLoaded is true and list is non-empty', async () => {
      useKnowledgeStore.setState({
        kbLoaded: true,
        knowledgeBases: [{ id: 'kb-1', name: 'Test', documentCount: 5 }] as any,
      })

      await useKnowledgeStore.getState().loadKnowledgeBases()

      expect(mockApi.get).not.toHaveBeenCalled()
    })

    it('calls API when kbLoaded is false', async () => {
      mockApi.get.mockResolvedValueOnce([{ id: 'kb-1', name: 'Test', documentCount: 5 }])

      await useKnowledgeStore.getState().loadKnowledgeBases()

      expect(mockApi.get).toHaveBeenCalledWith('/api/knowledge-bases')
      expect(useKnowledgeStore.getState().kbLoaded).toBe(true)
    })

    it('calls API when kbLoaded is true but list is empty', async () => {
      useKnowledgeStore.setState({ kbLoaded: true, knowledgeBases: [] })
      mockApi.get.mockResolvedValueOnce([{ id: 'kb-1', name: 'Test', documentCount: 5 }])

      await useKnowledgeStore.getState().loadKnowledgeBases()

      expect(mockApi.get).toHaveBeenCalledWith('/api/knowledge-bases')
    })
  })
})
