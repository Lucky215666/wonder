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
})
