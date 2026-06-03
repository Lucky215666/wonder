import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

import { useHistoryStore } from '../history'
import { api } from '../../services/api'

const mockApi = vi.mocked(api)

describe('useHistoryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useHistoryStore.setState({ items: [], loading: false, error: null, saving: false })
  })

  it('resets loading and sets error when loadHistory fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('network down'))

    await expect(useHistoryStore.getState().loadHistory()).resolves.toBeUndefined()

    expect(useHistoryStore.getState().loading).toBe(false)
    expect(useHistoryStore.getState().items).toEqual([])
    expect(useHistoryStore.getState().error).toBe('network down')
  })

  it('sets error and rethrows when deleteHistory fails', async () => {
    mockApi.delete.mockRejectedValueOnce(new Error('not found'))

    await expect(useHistoryStore.getState().deleteHistory('bad-id')).rejects.toThrow('not found')

    expect(useHistoryStore.getState().error).toBe('not found')
    expect(useHistoryStore.getState().saving).toBe(false)
  })
})
