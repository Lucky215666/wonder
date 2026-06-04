import type { DiscoveryContext } from '../../types/discovery'

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'we', 'our', 'you', 'your', 'they', 'their',
  'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'as', 'until', 'while', 'what', 'which', 'who', 'whom',
])

// Generic structural headings that are never research topics
const GENERIC_HEADINGS = new Set([
  'introduction', '背景', '引言', 'overview', '概述',
  'methods', 'method', '方法', 'methodology',
  'results', 'result', '结果', 'findings', '发现',
  'discussion', '讨论', 'conclusion', 'conclusions', '结论', '总结',
  'references', 'reference', '参考文献', 'bibliography',
  'acknowledgments', 'acknowledgements', '致谢',
  'appendix', 'appendices', '附录', 'supplementary', '补充材料',
  'abstract', '摘要', 'keywords', '关键词',
  'table of contents', '目录', 'readme', 'todo', 'changelog',
  'installation', '安装', 'usage', '使用', 'getting started', '快速开始',
  'contributing', '贡献', 'license', '许可证',
  'related work', '相关工作', 'future work', '未来工作',
  'experiments', '实验', 'evaluation', '评估', 'analysis', '分析',
  'implementation', '实现', 'architecture', '架构',
  'design', '设计', 'features', '功能',
])

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s一-鿿]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Extract meaningful phrases from a text block.
 * Returns multi-word phrases (not split into individual words).
 */
function extractPhrases(text: string): string[] {
  // Split by sentence boundaries, commas, semicolons
  const segments = text.split(/[,，;；。.!！\n]+/).map(s => s.trim()).filter(Boolean)
  const phrases: string[] = []

  for (const seg of segments) {
    const normalized = normalizeText(seg)
    if (!normalized || normalized.length < 4) continue
    // Skip generic structural headings
    if (GENERIC_HEADINGS.has(normalized)) continue
    // Skip if it's just stopwords
    const words = normalized.split(' ').filter(w => w.length > 1)
    const meaningful = words.filter(w => !STOPWORDS.has(w) && w.length > 2)
    if (meaningful.length === 0) continue
    // Keep the phrase if it has at least one meaningful word
    phrases.push(seg.trim())
  }

  return phrases
}

/**
 * Extract heading phrases from README markdown, keeping them as complete phrases.
 */
function extractHeadingPhrases(readme: string): string[] {
  const headingRegex = /^#{1,3}\s+(.+)$/gm
  const phrases: string[] = []
  let match

  while ((match = headingRegex.exec(readme)) !== null) {
    const heading = match[1].trim()
    const normalized = normalizeText(heading)
    // Skip generic structural headings
    if (GENERIC_HEADINGS.has(normalized)) continue
    // Skip very short headings
    if (normalized.length < 4) continue
    // Skip headings that are just numbers (like "1.", "2.1")
    if (/^\d+[\.\)、]/.test(normalized) && normalized.replace(/[\d\.\)、\s]/g, '').length < 4) continue
    phrases.push(heading)
  }

  return phrases
}

/**
 * Extract bold phrases from README markdown.
 */
function extractBoldPhrases(readme: string): string[] {
  const boldRegex = /\*\*([^*]+)\*\*/g
  const phrases: string[] = []
  let match

  while ((match = boldRegex.exec(readme)) !== null) {
    const text = match[1].trim()
    const normalized = normalizeText(text)
    if (GENERIC_HEADINGS.has(normalized)) continue
    if (normalized.length < 4) continue
    phrases.push(text)
  }

  return phrases
}

/**
 * Extract keywords from KB context: name, description, and readme.
 * Returns deduplicated, prioritized keywords (most relevant first).
 */
export function extractKeywords(name: string, description: string, readme: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  function addPhrase(phrase: string) {
    const key = normalizeText(phrase)
    if (!key || key.length < 3) return
    if (seen.has(key)) return
    seen.add(key)
    result.push(phrase.trim())
  }

  // Priority 1: KB name (most relevant)
  if (name) {
    addPhrase(name)
  }

  // Priority 2: KB description (contains research focus)
  if (description) {
    for (const phrase of extractPhrases(description)) {
      addPhrase(phrase)
    }
  }

  // Priority 3: README heading phrases
  if (readme) {
    for (const phrase of extractHeadingPhrases(readme)) {
      addPhrase(phrase)
    }
    for (const phrase of extractBoldPhrases(readme)) {
      addPhrase(phrase)
    }
  }

  return result.slice(0, 15)
}

function generateCoreTopicQuery(context: DiscoveryContext): string {
  // Use KB name + first description phrase as the primary query
  if (context.name) {
    return context.name
  }
  if (context.keywords.length > 0) {
    return context.keywords[0]
  }
  return ''
}

function generateKeywordQueries(context: DiscoveryContext): string[] {
  // Use individual keywords/phrases as queries, skip the first one (used as core topic)
  return context.keywords.slice(1, 5)
}

function generateSubDirectionQueries(context: DiscoveryContext): string[] {
  const queries: string[] = []
  const keywords = context.keywords

  if (keywords.length >= 2) {
    for (let i = 1; i < Math.min(4, keywords.length); i++) {
      queries.push(`${keywords[0]} ${keywords[i]}`)
    }
  }

  return queries
}

function generateMethodFocusedQueries(context: DiscoveryContext): string[] {
  const methodTerms = ['survey', 'review', 'benchmark']
  const queries: string[] = []

  if (context.keywords.length > 0) {
    const mainTopic = context.keywords[0]
    queries.push(`${mainTopic} ${methodTerms[0]}`)
  }

  return queries
}

function generateRecentPapersQuery(context: DiscoveryContext): string {
  const currentYear = new Date().getFullYear()
  if (context.keywords.length > 0) {
    return `${context.keywords[0]} ${currentYear}`
  }
  return `${context.name} ${currentYear}`
}

export function generateSuggestedQueries(context: DiscoveryContext): string[] {
  const queries: string[] = []

  const coreTopic = generateCoreTopicQuery(context)
  if (coreTopic) {
    queries.push(coreTopic)
  }

  queries.push(...generateKeywordQueries(context))
  queries.push(...generateSubDirectionQueries(context))
  queries.push(...generateMethodFocusedQueries(context))

  const recentQuery = generateRecentPapersQuery(context)
  if (recentQuery) {
    queries.push(recentQuery)
  }

  const unique = [...new Set(queries)]
  return unique.slice(0, 8)
}
