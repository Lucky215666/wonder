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
    })
  })

  it('resets legacy document loading when loadDocuments fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network down'))

    await expect(useKnowledgeStore.getState().loadDocuments()).resolves.toBeUndefined()

    expect(useKnowledgeStore.getState().loading).toBe(false)
    expect(useKnowledgeStore.getState().documents).toEqual([])
  })

  it('resets kb document loading when loadKBDocuments fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network down'))

    await expect(useKnowledgeStore.getState().loadKBDocuments('kb-1')).resolves.toBeUndefined()

    expect(useKnowledgeStore.getState().kbDocsLoading).toBe(false)
    expect(useKnowledgeStore.getState().kbDocuments).toEqual([])
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
})
