import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { StorageService } from '../services/storage'
import { LLMService } from '../services/llm'
import { randomUUID } from 'crypto'

export function analysisRoutes(storage: StorageService, llm: LLMService) {
  const app = new Hono()

  app.post('/single', async (c) => {
    const { fileName, fileType, text } = await c.req.json<{
      fileName: string; fileType: string; text: string
    }>()

    return streamSSE(c, async (stream) => {
      const docId = randomUUID()

      const steps = [
        {
          name: 'literature',
          label: '文献解析',
          prompt: `请分析以下文献内容，返回 JSON 格式：
{
  "summary": "一句话摘要",
  "readingCard": "结构化阅读卡片，包含：研究问题、方法、主要发现、局限性",
  "tags": ["标签1", "标签2"]
}

文献内容：
${text}`,
        },
        {
          name: 'relation',
          label: '关联分析',
          prompt: `基于以下文献内容，分析其与已有研究的关联，返回 JSON 格式：
{
  "relationAnalysis": "关联分析内容，包括：相关领域、可能的交叉研究方向、学术网络关系"
}

文献内容：
${text}`,
        },
        {
          name: 'writing',
          label: '写作素材',
          prompt: `基于以下文献内容，提取可用于学术写作的素材，返回 JSON 格式：
{
  "writingMaterials": "写作素材，包括：可引用的关键论述、数据支撑、方法论参考"
}

文献内容：
${text}`,
        },
        {
          name: 'todo',
          label: '待办提取',
          prompt: `基于以下文献内容，提取可能的研究待办事项，返回 JSON 格式：
{
  "todoList": "待办事项列表，包括：需要进一步阅读的文献、可复现的实验、待验证的假设"
}

文献内容：
${text}`,
        },
        {
          name: 'matching',
          label: '匹配评分',
          prompt: `基于以下文献内容，评估其与研究方向的匹配程度，返回 JSON 格式：
{
  "matchScore": 85,
  "matchReason": "匹配原因说明"
}

文献内容：
${text}`,
        },
      ]

      const results: Record<string, unknown> = {}

      for (const step of steps) {
        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: step.name, status: 'running', label: step.label }),
        })

        try {
          const response = await llm.call([{ role: 'user', content: step.prompt }])
          // Try to parse JSON from response
          const jsonMatch = response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            Object.assign(results, parsed)
          }
        } catch (err) {
          // Continue even if LLM call fails
          console.error(`Step ${step.name} failed:`, err)
        }

        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: step.name, status: 'done', label: step.label }),
        })
      }

      // Save document to database - ensure all values are SQLite-compatible types
      const safeStr = (v: unknown): string | undefined => {
        if (v == null) return undefined
        if (typeof v === 'string') return v
        return JSON.stringify(v)
      }
      const safeNum = (v: unknown): number | undefined => {
        return typeof v === 'number' ? v : undefined
      }
      const doc = {
        id: docId,
        fileName: fileName || 'unknown',
        filePath: null as string | null,
        fileType: fileType || 'unknown',
        summary: safeStr(results.summary),
        readingCard: safeStr(results.readingCard),
        relationAnalysis: safeStr(results.relationAnalysis),
        writingMaterials: safeStr(results.writingMaterials),
        todoList: safeStr(results.todoList),
        tags: safeStr(results.tags),
        matchScore: safeNum(results.matchScore),
      }
      storage.upsertDocument(doc)

      // Save to history
      storage.addHistory({
        id: randomUUID(),
        documentId: docId,
        result: JSON.stringify(results),
      })

      await stream.writeSSE({
        event: 'complete',
        data: JSON.stringify({ documentId: docId }),
      })
    })
  })

  return app
}
