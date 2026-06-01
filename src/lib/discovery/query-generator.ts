import type { DiscoveryContext } from '../../types/discovery'

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

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

function extractHeadingKeywords(readme: string): string[] {
  const headingRegex = /^#{1,3}\s+(.+)$/gm
  const keywords: string[] = []
  let match

  while ((match = headingRegex.exec(readme)) !== null) {
    const heading = match[1].trim()
    const words = normalizeText(heading).split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w))
    keywords.push(...words)
  }

  return [...new Set(keywords)]
}

function extractBoldKeywords(readme: string): string[] {
  const boldRegex = /\*\*([^*]+)\*\*/g
  const keywords: string[] = []
  let match

  while ((match = boldRegex.exec(readme)) !== null) {
    const text = match[1].trim()
    const words = normalizeText(text).split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w))
    keywords.push(...words)
  }

  return [...new Set(keywords)]
}

function extractCodeBlockTerms(readme: string): string[] {
  const codeRegex = /`([^`]+)`/g
  const terms: string[] = []
  let match

  while ((match = codeRegex.exec(readme)) !== null) {
    const term = match[1].trim()
    if (term.length > 2 && term.length < 30) {
      terms.push(term)
    }
  }

  return [...new Set(terms)]
}

export function extractKeywords(readme: string): string[] {
  const headingKeywords = extractHeadingKeywords(readme)
  const boldKeywords = extractBoldKeywords(readme)
  const codeTerms = extractCodeBlockTerms(readme)

  const allKeywords = [...new Set([...headingKeywords, ...boldKeywords, ...codeTerms])]

  const filtered = allKeywords.filter(kw => {
    const normalized = normalizeText(kw)
    return normalized.length > 2 && !STOPWORDS.has(normalized)
  })

  return filtered.slice(0, 20)
}

function generateCoreTopicQuery(context: DiscoveryContext): string {
  if (context.keywords.length > 0) {
    return context.keywords.slice(0, 3).join(' ')
  }
  return context.name
}

function generateKeywordQueries(context: DiscoveryContext): string[] {
  return context.keywords.slice(0, 5).map(kw => kw)
}

function generateSubDirectionQueries(context: DiscoveryContext): string[] {
  const queries: string[] = []
  const keywords = context.keywords

  if (keywords.length >= 2) {
    for (let i = 0; i < Math.min(3, keywords.length - 1); i++) {
      queries.push(`${keywords[0]} ${keywords[i + 1]}`)
    }
  }

  return queries
}

function generateMethodFocusedQueries(context: DiscoveryContext): string[] {
  const methodTerms = ['method', 'approach', 'algorithm', 'technique', 'framework', 'model']
  const queries: string[] = []

  if (context.keywords.length > 0) {
    const mainTopic = context.keywords[0]
    queries.push(`${mainTopic} ${methodTerms[0]}`)
    queries.push(`${mainTopic} ${methodTerms[4]}`)
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
