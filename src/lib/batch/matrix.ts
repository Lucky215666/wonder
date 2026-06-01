export const MATRIX_DIMENSIONS = [
  'research_question',
  'method',
  'dataset',
  'metrics',
  'innovation',
  'limitation',
  'reusable_idea',
] as const

export type DimensionKey = typeof MATRIX_DIMENSIONS[number]

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  research_question: '研究问题',
  method: '方法',
  dataset: '数据集',
  metrics: '指标',
  innovation: '创新点',
  limitation: '局限性',
  reusable_idea: '可复用想法',
}

export interface MatrixRow {
  documentId: string
  fileName: string
  research_question: string
  method: string
  dataset: string
  metrics: string
  innovation: string
  limitation: string
  reusable_idea: string
}

/**
 * Parse a readingCard markdown into sections by ## headers.
 * Returns a map of section title -> content.
 */
function parseSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>()
  const lines = markdown.split('\n')
  let currentTitle = ''
  let currentContent: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^##\s*\d*\.?\s*(.+)/)
    if (headerMatch) {
      if (currentTitle) {
        sections.set(currentTitle.trim(), currentContent.join('\n').trim())
      }
      currentTitle = headerMatch[1]
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }
  if (currentTitle) {
    sections.set(currentTitle.trim(), currentContent.join('\n').trim())
  }

  return sections
}

/**
 * Find a section by partial title match (case-insensitive).
 */
function findSection(sections: Map<string, string>, ...keywords: string[]): string {
  for (const [title, content] of sections) {
    const lowerTitle = title.toLowerCase()
    for (const kw of keywords) {
      if (lowerTitle.includes(kw.toLowerCase())) {
        return content
      }
    }
  }
  return ''
}

/**
 * Truncate text to maxLen, adding ellipsis if needed.
 */
function truncate(text: string, maxLen: number): string {
  const clean = text.replace(/[*_#`]/g, '').trim()
  if (!clean) return '-'
  if (clean.length <= maxLen) return clean
  return clean.slice(0, maxLen) + '...'
}

/**
 * Extract the first sentence or paragraph from text.
 */
function firstSentence(text: string, maxLen = 150): string {
  const clean = text.replace(/[*_#`]/g, '').trim()
  if (!clean) return '-'
  // Try to split by sentence-ending punctuation
  const match = clean.match(/^[^。！？.!?]+[。！？.!?]/)
  if (match && match[0].length <= maxLen) return match[0].trim()
  return truncate(clean, maxLen)
}

export function extractMatrixRow(
  documentId: string,
  fileName: string,
  analysisResult: Record<string, unknown>,
): MatrixRow {
  const readingCard = (analysisResult.readingCard as string) || ''
  const summary = (analysisResult.summary as string) || ''
  const writingAssets = analysisResult.writingAssets as Record<string, unknown> | undefined
  const novelty = analysisResult.noveltyForKnowledgeBase as string | undefined

  const sections = parseSections(readingCard)

  // research_question: Section 2 "Core Pain Points" or summary
  const painPoints = findSection(sections, 'pain point', '痛点', '核心问题', 'core problem')
  const research_question = painPoints
    ? firstSentence(painPoints)
    : firstSentence(summary)

  // method: Section 3 "Method/System"
  const methodContent = findSection(sections, 'method', '方法', 'workflow', '工作流', '系统')
  const method = methodContent ? truncate(methodContent, 200) : '-'

  // dataset + metrics: Section 4 "Datasets, Experiment Settings & Metrics"
  const experimentContent = findSection(sections, 'dataset', '数据集', 'experiment', '实验', 'metrics', '指标')
  let dataset = '-'
  let metrics = '-'
  if (experimentContent) {
    const expLines = experimentContent.split('\n').filter(l => l.trim())
    // Try to split dataset and metrics parts
    const datasetMatch = experimentContent.match(/(?:数据集|Dataset|数据源|Data Source)[：:]\s*([^\n]+)/i)
    if (datasetMatch) {
      dataset = truncate(datasetMatch[1], 150)
    } else if (expLines.length > 0) {
      dataset = truncate(expLines[0], 150)
    }
    const metricsMatch = experimentContent.match(/(?:指标|Metrics?|评估|Evaluation)[：:]\s*([^\n]+)/i)
    if (metricsMatch) {
      metrics = truncate(metricsMatch[1], 150)
    } else if (expLines.length > 1) {
      metrics = truncate(expLines[1], 150)
    }
  }

  // innovation: Section 6 or noveltyForKnowledgeBase
  const innovationContent = findSection(sections, 'innovation', '创新', 'reference', '参考价值', '复用')
  const innovation = novelty
    ? truncate(novelty, 200)
    : innovationContent
      ? truncate(innovationContent, 200)
      : '-'

  // limitation: Section 7 or writingAssets.limitationsOrCritique
  const limitationContent = findSection(sections, 'limitation', '局限', '潜在问题', 'potential')
  const writingLimitation = (writingAssets?.limitationsOrCritique as string) || ''
  const limitation = limitationContent
    ? truncate(limitationContent, 200)
    : writingLimitation
      ? truncate(writingLimitation, 200)
      : '-'

  // reusable_idea: Section 6 content or writingAssets.usableClaims[0]
  const usableClaims = (writingAssets?.usableClaims as string[]) || []
  const possibleUse = (writingAssets?.possibleLiteratureReviewUse as string) || ''
  const reusable_idea = usableClaims.length > 0
    ? truncate(usableClaims[0], 200)
    : possibleUse
      ? truncate(possibleUse, 200)
      : innovationContent
        ? firstSentence(innovationContent, 150)
        : '-'

  return {
    documentId,
    fileName,
    research_question,
    method,
    dataset,
    metrics,
    innovation,
    limitation,
    reusable_idea,
  }
}

export function exportMatrixCSV(rows: MatrixRow[]): string {
  const headers = [
    'File Name',
    ...MATRIX_DIMENSIONS.map(k => DIMENSION_LABELS[k]),
  ]

  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row =>
      [row.fileName, ...MATRIX_DIMENSIONS.map(k => row[k])].map(escapeCSV).join(','),
    ),
  ]

  return csvRows.join('\n')
}

export function exportMatrixMarkdown(rows: MatrixRow[]): string {
  if (rows.length === 0) return '_暂无数据_'

  const headers = ['文档', ...MATRIX_DIMENSIONS.map(k => DIMENSION_LABELS[k])]
  const sep = headers.map(() => '---')

  const tableRows = rows.map(row =>
    [row.fileName, ...MATRIX_DIMENSIONS.map(k => row[k].replace(/\n/g, ' '))],
  )

  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...tableRows.map(r => `| ${r.join(' | ')} |`),
  ]

  return lines.join('\n')
}
