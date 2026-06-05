import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { StorageService } from '../services/storage'
import { PythonBackendClient } from '../services/python-backend'
import { randomUUID } from 'crypto'
import { extractDocumentMetadata, metadataStatus } from '../services/document-metadata'

function extractTopicSummary(readingCard: string, maxLen = 500): string {
  if (!readingCard) return ''
  // Try "## 1. Topic Summary" or similar
  const match = readingCard.match(/##\s*(?:\d+[.)、]\s*)?Topic\s*Summary\s*\n([\s\S]*?)(?=\n##\s|\Z)/i)
  if (match?.[1]?.trim()) return match[1].trim().slice(0, maxLen)
  // Try Chinese heading
  const match2 = readingCard.match(/##\s*(?:\d+[.)、]\s*)?(?:主题摘要|摘要|概要)\s*\n([\s\S]*?)(?=\n##\s|\Z)/)
  if (match2?.[1]?.trim()) return match2[1].trim().slice(0, maxLen)
  // Fallback: first non-heading line
  for (const line of readingCard.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) return trimmed.slice(0, maxLen)
  }
  return ''
}

interface PythonGatewayResponse {
  doc_id: string
  file_name: string
  paper_title?: string
  status: 'ok' | 'partial'
  failed_agents: string[]
  reading_card: string
  relation_analysis: string
  writing_materials: string
  todo_list: string
  summary: string
  tags: string[]
  fit_score?: number
  fit_reason?: string
  relation_type?: string
  placement?: string
  recommended_action?: string
  readme_suggestions: Array<{ section: string; suggestion: string; reason?: string }>
  source_chunks: string[]
  suggested_placement?: { sub_direction: string; tags: string[] }
  novelty_for_kb?: string
  writing_assets?: {
    usable_claims: string[]
    method_references: string[]
    theory_references: string[]
    possible_literature_review_use: string
    limitations_or_critique: string
  }
}

function toPlainString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value == null) return fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return fallback
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => toPlainString(item).trim())
    .filter(Boolean)
}

function toReadmeSuggestions(value: unknown): Array<{ section: string; suggestion: string; reason?: string }> {
  if (!Array.isArray(value)) return []
  return value
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map(item => {
      const raw = item as Record<string, unknown>
      return {
        section: toPlainString(raw.section).trim(),
        suggestion: toPlainString(raw.suggestion).trim(),
        reason: toPlainString(raw.reason).trim() || undefined,
      }
    })
    .filter(item => item.section || item.suggestion)
}

function toSuggestedPlacement(value: unknown): { sub_direction: string; tags: string[] } | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const subDirection = toPlainString(raw.sub_direction ?? raw.subDirection).trim()
  const tags = toStringArray(raw.tags)
  if (!subDirection && tags.length === 0) return undefined
  return { sub_direction: subDirection, tags }
}

function toWritingAssets(value: unknown): PythonGatewayResponse['writing_assets'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const assets = {
    usable_claims: toStringArray(raw.usable_claims ?? raw.usableClaims),
    method_references: toStringArray(raw.method_references ?? raw.methodReferences),
    theory_references: toStringArray(raw.theory_references ?? raw.theoryReferences),
    possible_literature_review_use: toPlainString(raw.possible_literature_review_use ?? raw.possibleLiteratureReviewUse),
    limitations_or_critique: toPlainString(raw.limitations_or_critique ?? raw.limitationsOrCritique),
  }
  const hasContent = assets.usable_claims.length > 0
    || assets.method_references.length > 0
    || assets.theory_references.length > 0
    || assets.possible_literature_review_use
    || assets.limitations_or_critique
  return hasContent ? assets : undefined
}

export function analysisRoutes(storage: StorageService, python: PythonBackendClient) {
  const app = new Hono()

  app.post('/single', async (c) => {
    const body = await c.req.json<{
      fileName: string
      fileType: string
      text: string
      knowledgeBaseId?: string
      pdfTitle?: string
    }>()

    const { fileName, fileType, text, knowledgeBaseId, pdfTitle } = body
    if (!text) return c.json({ error: '文本内容不能为空' }, 400)

    return streamSSE(c, async (stream) => {
      const docId = randomUUID()
      const abortController = new AbortController()
      stream.onAbort(() => { abortController.abort() })

      try {
        // Load KB context
        let kbContext = ''
        if (knowledgeBaseId) {
          const kb = storage.getKnowledgeBase(knowledgeBaseId)
          if (kb) {
            kbContext = `知识库名称：${kb.name}\n`
            if (kb.description) kbContext += `描述：${kb.description}\n`
            if (kb.readme) kbContext += `README：\n${kb.readme}\n`
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

        // Load chat config to pass to Python backend
        let chatConfig: Record<string, unknown> | undefined
        try {
          const raw = storage.getConfig('appConfig')
          if (raw) {
            const parsed = JSON.parse(raw)
            chatConfig = parsed.chat || undefined
          }
        } catch { /* ignore */ }

        // Step 2+: Forward Python SSE events
        const truncatedText = text.length > 50000 ? text.slice(0, 50000) + '\n\n[文本已截断]' : text

        const stepLabels: Record<string, string> = {
          literature: '文献解析',
          relation: '关联分析',
          writing: '写作素材',
          todo: '待办提取',
        }
        let result: PythonGatewayResponse | null = null

        for await (const sse of python.postSSE('/api/analysis/gateway', {
          doc_id: docId,
          file_name: fileName,
          file_type: fileType,
          text: truncatedText,
          knowledge_base_id: knowledgeBaseId,
          knowledge_base_readme: kbContext,
          global_profile: knowledgeBaseId ? '' : globalProfile,
          max_chars: 7000,
          overlap: 500,
          chat_config: chatConfig,
          pdf_title: pdfTitle || '',
        }, abortController.signal)) {
          if (sse.event === 'agent_start') {
            const { step } = JSON.parse(sse.data) as { step: string }
            await stream.writeSSE({
              event: 'step',
              data: JSON.stringify({ step, status: 'running', label: stepLabels[step] || step }),
            })
          } else if (sse.event === 'progress') {
            const { step, chunkCount, total } = JSON.parse(sse.data) as { step: string; chunkCount: number; total: number }
            await stream.writeSSE({
              event: 'progress',
              data: JSON.stringify({ step, chunkCount, total }),
            })
          } else if (sse.event === 'agent_done') {
            const { step } = JSON.parse(sse.data) as { step: string }
            await stream.writeSSE({
              event: 'step',
              data: JSON.stringify({ step, status: 'done', label: stepLabels[step] || step }),
            })
          } else if (sse.event === 'complete') {
            result = JSON.parse(sse.data) as PythonGatewayResponse
          } else if (sse.event === 'error') {
            const errData = JSON.parse(sse.data) as { error: string }
            throw new Error(errData.error)
          }
        }

        if (!result) {
          throw new Error('Python backend did not return analysis result')
        }

        const safeReadingCard = toPlainString(result.reading_card)
        const safeSummary = extractTopicSummary(safeReadingCard) || toPlainString(result.summary) || toPlainString(result.file_name)
        const safeRelationAnalysis = toPlainString(result.relation_analysis)
        const safeWritingMaterials = toPlainString(result.writing_materials)
        const safeTodoList = toPlainString(result.todo_list)
        const safeTags = toStringArray(result.tags)
        const safeReadmeSuggestions = toReadmeSuggestions(result.readme_suggestions)
        const safeSuggestedPlacement = toSuggestedPlacement(result.suggested_placement)
        const safeWritingAssets = toWritingAssets(result.writing_assets)

        // Step 3: 存储
        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'store', status: 'running', label: '保存结果' }),
        })

        storage.upsertDocument({
          id: docId,
          fileName,
          fileType,
          summary: safeSummary,
          readingCard: safeReadingCard,
          relationAnalysis: safeRelationAnalysis,
          writingMaterials: safeWritingMaterials,
          todoList: safeTodoList,
          tags: safeTags.length > 0 ? safeTags.join(',') : undefined,
          matchScore: result.fit_score,
        })

        // Persist document metadata extracted from analysis result
        const extractedMeta = extractDocumentMetadata({
          fileName,
          readingCard: safeReadingCard,
          summary: safeSummary,
          analysisResult: {
            paper_title: result.paper_title,
            pdf_title: pdfTitle,
            authors: (result as any).authors,
            year: (result as any).year,
            venue: (result as any).venue,
            doi: (result as any).doi,
            abstract: (result as any).abstract,
            keywords: (result as any).keywords,
          },
        })
        storage.upsertDocumentMetadata({
          documentId: docId,
          title: extractedMeta.title,
          authors: extractedMeta.authors,
          year: extractedMeta.year,
          venue: extractedMeta.venue,
          doi: extractedMeta.doi,
          url: extractedMeta.url,
          abstract: extractedMeta.abstract,
          keywords: extractedMeta.keywords,
          metadataStatus: metadataStatus(extractedMeta),
          metadataSource: extractedMeta.source,
        })

        // Store source chunks for later vector indexing (used by "收录" button)
        if (Array.isArray(result.source_chunks)) {
          for (let i = 0; i < result.source_chunks.length; i++) {
            storage.insertChunk({
              id: randomUUID(),
              documentId: docId,
              content: result.source_chunks[i],
              chunkIndex: i,
            })
          }
        }

        // Save README suggestions (KB context is used for analysis, but document is NOT auto-added to KB)
        if (knowledgeBaseId && safeReadmeSuggestions.length > 0) {
          for (const sug of safeReadmeSuggestions) {
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

        // Save history (dual snake_case + camelCase for backward compat)
        const historyId = randomUUID()
        const historyResult: Record<string, unknown> = {
          summary: safeSummary,
          paper_title: toPlainString(result.paper_title) || undefined,
          paperTitle: toPlainString(result.paper_title) || undefined,
          reading_card: safeReadingCard,
          readingCard: safeReadingCard,
          fit_score: result.fit_score,
          knowledgeBaseFitScore: result.fit_score,
          fit_reason: toPlainString(result.fit_reason),
          fitReason: toPlainString(result.fit_reason),
          relation_type: toPlainString(result.relation_type),
          relation_analysis: safeRelationAnalysis,
          writing_materials: safeWritingMaterials,
          todo_list: safeTodoList,
          recommended_action: toPlainString(result.recommended_action),
          recommendedAction: toPlainString(result.recommended_action),
          tags: safeTags,
          suggested_placement: safeSuggestedPlacement,
          suggestedPlacement: safeSuggestedPlacement
            ? { subDirection: safeSuggestedPlacement.sub_direction, tags: safeSuggestedPlacement.tags }
            : undefined,
          novelty_for_kb: toPlainString(result.novelty_for_kb),
          noveltyForKnowledgeBase: toPlainString(result.novelty_for_kb) || undefined,
          readme_suggestions: safeReadmeSuggestions,
          readmeUpdateSuggestions: safeReadmeSuggestions.length ? safeReadmeSuggestions : undefined,
          writing_assets: safeWritingAssets,
          writingAssets: safeWritingAssets ? {
            usableClaims: safeWritingAssets.usable_claims,
            methodReferences: safeWritingAssets.method_references,
            theoryReferences: safeWritingAssets.theory_references,
            possibleLiteratureReviewUse: safeWritingAssets.possible_literature_review_use,
            limitationsOrCritique: safeWritingAssets.limitations_or_critique,
          } : undefined,
          knowledgeBaseId: knowledgeBaseId || null,
          fileName: fileName,
        }
        storage.addHistory({ id: historyId, documentId: docId, result: JSON.stringify(historyResult) })

        await stream.writeSSE({
          event: 'step',
          data: JSON.stringify({ step: 'store', status: 'done', label: '保存结果' }),
        })

        // Complete — include full analysis result so frontend can display immediately
        await stream.writeSSE({
          event: 'complete',
          data: JSON.stringify({
            documentId: docId,
            knowledgeBaseId: knowledgeBaseId || null,
            historyId,
            result: {
              summary: safeSummary,
              paperTitle: toPlainString(result.paper_title) || undefined,
              readingCard: safeReadingCard,
              knowledgeBaseFitScore: result.fit_score,
              fitReason: toPlainString(result.fit_reason),
              relationType: toPlainString(result.relation_type),
              relationAnalysis: safeRelationAnalysis,
              writingMaterials: safeWritingMaterials,
              todoList: safeTodoList,
              recommendedAction: toPlainString(result.recommended_action),
              tags: safeTags,
              suggestedPlacement: safeSuggestedPlacement
                ? { subDirection: safeSuggestedPlacement.sub_direction, tags: safeSuggestedPlacement.tags }
                : undefined,
              noveltyForKnowledgeBase: toPlainString(result.novelty_for_kb) || undefined,
              readmeUpdateSuggestions: safeReadmeSuggestions.length ? safeReadmeSuggestions : undefined,
              writingAssets: safeWritingAssets ? {
                usableClaims: safeWritingAssets.usable_claims,
                methodReferences: safeWritingAssets.method_references,
                theoryReferences: safeWritingAssets.theory_references,
                possibleLiteratureReviewUse: safeWritingAssets.possible_literature_review_use,
                limitationsOrCritique: safeWritingAssets.limitations_or_critique,
              } : undefined,
            },
          }),
        })
      } catch (err) {
        if (abortController.signal.aborted) {
          await stream.writeSSE({
            event: 'cancel',
            data: JSON.stringify({ message: '分析已取消' }),
          })
        } else {
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
          })
        }
      }
    })
  })

  return app
}
