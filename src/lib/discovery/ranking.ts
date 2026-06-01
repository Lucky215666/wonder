interface PaperMetadata {
  title: string
  abstract: string | null
  year: number | null
  citationCount: number
  influentialCitationCount?: number
  venue?: string
}

interface RankingResult {
  score: number
  reason: string
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractWordSet(text: string): Set<string> {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'we', 'our', 'you', 'your', 'they', 'their',
  ])
  return new Set(
    normalizeText(text)
      .split(' ')
      .filter(w => w.length > 2 && !stopwords.has(w))
  )
}

function countKeywordMatches(textWords: Set<string>, keywords: string[]): { count: number; matched: string[] } {
  const matched: string[] = []
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword)
    const keywordWords = normalizedKeyword.split(' ').filter(w => w.length > 2)
    for (const kw of keywordWords) {
      if (textWords.has(kw)) {
        matched.push(keyword)
        break
      }
    }
  }
  return { count: matched.length, matched }
}

function scoreToReason(titleMatches: string[], abstractMatches: string[], recencyScore: number, citationScore: number): string {
  const reasons: string[] = []

  if (titleMatches.length > 0) {
    reasons.push(`标题匹配: ${titleMatches.slice(0, 3).join(', ')}`)
  }
  if (abstractMatches.length > 0) {
    reasons.push(`摘要匹配: ${abstractMatches.slice(0, 3).join(', ')}`)
  }
  if (recencyScore > 10) {
    reasons.push('近期发表')
  }
  if (citationScore > 10) {
    reasons.push('高引用')
  }

  return reasons.length > 0 ? reasons.join(' · ') : '通用匹配'
}

export function calculateDiscoveryPriorityScore(
  paper: PaperMetadata,
  keywords: string[],
  currentYear: number = new Date().getFullYear()
): RankingResult {
  let score = 0
  const titleMatches: string[] = []
  const abstractMatches: string[] = []

  // Title keyword match: up to 35 points
  const titleWords = extractWordSet(paper.title)
  const titleResult = countKeywordMatches(titleWords, keywords)
  const titleScore = Math.min(35, (titleResult.count / Math.max(1, keywords.length)) * 35)
  score += titleScore
  titleMatches.push(...titleResult.matched)

  // Abstract keyword match: up to 25 points
  let abstractScore = 0
  if (paper.abstract) {
    const abstractWords = extractWordSet(paper.abstract)
    const abstractResult = countKeywordMatches(abstractWords, keywords)
    abstractScore = Math.min(25, (abstractResult.count / Math.max(1, keywords.length)) * 25)
    score += abstractScore
    abstractMatches.push(...abstractResult.matched)
  }

  // Recency: up to 15 points
  let recencyScore = 0
  if (paper.year) {
    const age = currentYear - paper.year
    if (age <= 1) {
      recencyScore = 15
    } else if (age <= 3) {
      recencyScore = 12
    } else if (age <= 5) {
      recencyScore = 8
    } else if (age <= 10) {
      recencyScore = 4
    }
    score += recencyScore
  }

  // Citation signal: up to 15 points
  let citationScore = 0
  if (paper.citationCount > 0) {
    if (paper.citationCount >= 1000) {
      citationScore = 15
    } else if (paper.citationCount >= 100) {
      citationScore = 12
    } else if (paper.citationCount >= 50) {
      citationScore = 9
    } else if (paper.citationCount >= 10) {
      citationScore = 6
    } else {
      citationScore = 3
    }
    score += citationScore
  }

  // Abstract exists: 5 points
  if (paper.abstract) {
    score += 5
  }

  // Venue exists: 5 points
  if (paper.venue) {
    score += 5
  }

  const reason = scoreToReason(titleMatches, abstractMatches, recencyScore, citationScore)

  return {
    score: Math.round(score),
    reason,
  }
}
