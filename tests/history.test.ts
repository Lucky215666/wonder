import { describe, expect, it } from 'vitest'
import { HistoryManager } from '@/lib/core/history'
import { MemoryStorageAdapter } from '@/lib/core/storage'

describe('HistoryManager', () => {
  it('saves, lists, reads, and deletes records', async () => {
    const storage = new MemoryStorageAdapter()
    const manager = new HistoryManager(storage)

    const id = await manager.saveRecord({
      fileName: 'paper.pdf',
      model: 'MiniMax-M2.7',
      summary: 'summary',
      readingCard: '# Card',
      relationAnalysis: '# Relation',
      writingMaterials: '# Writing',
      todoList: '# Todo',
      fullReport: '# Full',
    })

    const list = await manager.listRecords()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(id)

    const record = await manager.getRecord(id)
    expect(record?.fileName).toBe('paper.pdf')

    await manager.deleteRecord(id)
    expect(await manager.listRecords()).toEqual([])
  })
})
