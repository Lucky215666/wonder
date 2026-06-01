import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { StorageService } from '../services/storage'
import { LLMService } from '../services/llm'
import { randomUUID } from 'crypto'

function buildSystemPrompt(kbContext: string, globalProfile: string): string {
  let prompt = `你是一个学术文献分析助手。请分析用户提供的学术文档，返回严格的 JSON 格式结果。

返回格式（必须是合法 JSON，不要包含任何其他文字）：
{
  "summary": "一句话核心摘要",
  "readingCard": "结构化阅读卡片，包含：\\n1. 研究问题\\n2. 研究方法\\n3. 主要发现\\n4. 核心结论\\n5. 局限性",
  "knowledgeBaseFitScore": 0-100 的整数（与知识库的适配程度）,
  "fitReason": "适配分理由",
  "recommendedAction": "add | deep_read | skim | track_citations | add_to_other_kb | ignore",
  "suggestedPlacement": {
    "subDirection": "建议的子研究方向",
    "tags": ["标签1", "标签2"]
  },
  "relationToExistingDocs": {
    "type": "supplement | duplicate | conflict | extension | method_reference | unrelated",
    "reason": "与已有文献关系的分析",
    "relatedDocumentIds": []
  },
  "noveltyForKnowledgeBase": "这篇文献对知识库的新贡献",
  "writingAssets": {
    "usableClaims": ["可引用的关键论点1", "可引用的关键论点2"],
    "methodReferences": ["方法论参考1"],
    "theoryReferences": ["理论参考1"],
    "possibleLiteratureReviewUse": "在文献综述中的可能用途",
    "limitationsOrCritique": "局限性与可批评之处"
  },
  "readmeUpdateSuggestions": [
    { "section": "建议更新的 README 章节", "suggestion": "具体建议", "reason": "原因" }
  ],
  "tags": ["标签1", "标签2"]
}`

  if (kbContext) {
    prompt += `\n\n以下是目标知识库的信息，请基于此上下文进行分析：\n${kbContext}`
  }

  if (globalProfile) {
    prompt += `\n\n研究者背景：\n${globalProfile}`
  }

  return prompt
}

export function analysisRoutes(storage: StorageService, llm: LLMService) {
  const app = new Hono()

  app.post('/single', async (c) => {
    const body = await c.req.json<{
      fileName: string
      fileType: string
      text: string
      knowledgeBaseId?: string
    }>()

    const { fileName, fileType, text, knowledgeBaseId } = body
    if (!text) return c.json({ error: '文本内容不能为空' }, 400)

    return streamSSE(c, async (stream) => {
      const docId = randomUUID()
      let cancelled = false
      stream.onAbort(() => { cancelled = true })

      try {
        // Step 1: 解析完成
        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'literature', status: 'done', label: '文献解析', progress: 0 }),
        })

        // Load KB context
        let kbContext = ''
        if (knowledgeBaseId) {
          const kb = storage.getKnowledgeBase(knowledgeBaseId)
          if (kb) {
            kbContext = `知识库名称：${kb.name}\n`
            if (kb.description) kbContext += `描述：${kb.description}\n`
            if (kb.readme) kbContext += `README：\n${kb.readme}\n`
            // Add existing doc summaries for relation analysis
            const existingDocs = storage.getDocumentsByKB(knowledgeBaseId)
            if (existingDocs.length > 0) {
              kbContext += `\n知识库中已有 ${existingDocs.length} 篇文献，摘要如下：\n`
              for (const doc of existingDocs.slice(0, 10)) {
                kbContext += `- ${doc.file_name}: ${doc.summary || '无摘要'}\n`
              }
            }
          }
        }

        const globalProfile = storage.getConfig('globalProfile') || ''

        // Step 2: LLM 分析
        if (cancelled) return
        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'relation', status: 'running', label: '关联分析', progress: 0 }),
        })

        const systemPrompt = buildSystemPrompt(kbContext, globalProfile)
        const truncatedText = text.length > 50000 ? text.slice(0, 50000) + '\n\n[文本已截断]' : text
        const userPrompt = `请分析以下学术文献：\n\n文件名：${fileName}\n文件类型：${fileType}\n\n${truncatedText}`

        let fullResponse = ''
        let chunkCount = 0
        const generator = llm.callStream([{ role: 'user', content: userPrompt }], systemPrompt)

        for await (const token of generator) {
          if (cancelled) {
            await generator.return(undefined)
            break
          }
          fullResponse += token
          chunkCount++
          if (chunkCount % 20 === 0) {
            await stream.writeSSE({
              event: 'progress',
              data: JSON.stringify({ step: 'relation', chunkCount }),
            })
          }
        }

        if (cancelled) {
          await stream.writeSSE({
            event: 'cancel',
            data: JSON.stringify({ message: '分析已取消' }),
          })
          return
        }

        // Parse LLM response
        let analysisResult: Record<string, unknown> = {}
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            analysisResult = JSON.parse(jsonMatch[0])
          } catch {
            // If JSON parse fails, wrap raw text as summary
            analysisResult = { summary: fullResponse.slice(0, 500) }
          }
        } else {
          analysisResult = { summary: fullResponse.slice(0, 500) }
        }

        // Mark remaining steps done
        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'relation', status: 'done', label: '关联分析', progress: chunkCount }),
        })
        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'writing', status: 'done', label: '写作素材', progress: 0 }),
        })
        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'todo', status: 'done', label: '待办提取', progress: 0 }),
        })

        // Step 3: 存储
        if (cancelled) return
        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'store', status: 'running', label: '保存结果', progress: 0 }),
        })

        const safeStr = (v: unknown): string | undefined => {
          if (v == null) return undefined
          if (typeof v === 'string') return v
          return JSON.stringify(v)
        }
        const safeNum = (v: unknown): number | undefined => {
          return typeof v === 'number' ? v : undefined
        }

        storage.upsertDocument({
          id: docId,
          fileName,
          fileType,
          summary: safeStr(analysisResult.summary),
          readingCard: safeStr(analysisResult.readingCard),
          relationAnalysis: safeStr(analysisResult.relationToExistingDocs),
          writingMaterials: safeStr(analysisResult.writingAssets),
          todoList: safeStr(analysisResult.noveltyForKnowledgeBase),
          tags: Array.isArray(analysisResult.tags) ? analysisResult.tags.join(',') : safeStr(analysisResult.tags),
          matchScore: safeNum(analysisResult.knowledgeBaseFitScore),
        })

        // Link to KB if selected
        if (knowledgeBaseId) {
          storage.addDocumentToKB({
            documentId: docId,
            knowledgeBaseId,
            subDirection: (analysisResult.suggestedPlacement as { subDirection?: string })?.subDirection,
            tags: Array.isArray(analysisResult.tags) ? analysisResult.tags.join(',') : undefined,
            fitScore: safeNum(analysisResult.knowledgeBaseFitScore),
            recommendedAction: safeStr(analysisResult.recommendedAction),
          })

          // Save README suggestions
          const suggestions = analysisResult.readmeUpdateSuggestions as Array<{ section: string; suggestion: string; reason?: string }> | undefined
          if (Array.isArray(suggestions)) {
            for (const sug of suggestions) {
              storage.addReadmeSuggestion({
                id: randomUUID(),
                knowledgeBaseId,
                documentId: docId,
                section: sug.section,
                suggestion: sug.suggestion,
                reason: sug.reason,
              })
            }
          }
        }

        // Save history
        const historyId = randomUUID()
        storage.addHistory({ id: historyId, documentId: docId, result: JSON.stringify(analysisResult) })

        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'store', status: 'done', label: '保存结果', progress: 0 }),
        })

        // Complete
        await stream.writeSSE({
          event: 'complete',
          data: JSON.stringify({ documentId: docId, knowledgeBaseId: knowledgeBaseId || null, historyId }),
        })
      } catch (err) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
        })
      }
    })
  })

  return app
}
