import { describe, it, expect } from 'vitest'
import { calculateDiscoveryPriorityScore } from '../ranking'

describe('calculateDiscoveryPriorityScore', () => {
  const currentYear = 2026

  it('should return high score for title keyword match', () => {
    const paper = {
      title: 'Retrieval Augmented Generation for Knowledge-Intensive NLP Tasks',
      abstract: null,
      year: 2024,
      citationCount: 100,
    }
    const keywords = ['retrieval', 'augmented', 'generation']

    const result = calculateDiscoveryPriorityScore(paper, keywords, currentYear)

    expect(result.score).toBeGreaterThan(30)
    expect(result.reason).toContain('标题匹配')
  })

  it('should return high score for abstract keyword match', () => {
    const paper = {
      title: 'Some Paper',
      abstract: 'This paper proposes a novel retrieval augmented generation approach for NLP tasks.',
      year: 2024,
      citationCount: 50,
    }
    const keywords = ['retrieval', 'augmented', 'generation']

    const result = calculateDiscoveryPriorityScore(paper, keywords, currentYear)

    expect(result.score).toBeGreaterThan(20)
    expect(result.reason).toContain('摘要匹配')
  })

  it('should give recency bonus for recent papers', () => {
    const recentPaper = {
      title: 'Test Paper',
      abstract: null,
      year: 2025,
      citationCount: 10,
    }
    const oldPaper = {
      title: 'Test Paper',
      abstract: null,
      year: 2015,
      citationCount: 10,
    }
    const keywords = ['test']

    const recentResult = calculateDiscoveryPriorityScore(recentPaper, keywords, currentYear)
    const oldResult = calculateDiscoveryPriorityScore(oldPaper, keywords, currentYear)

    expect(recentResult.score).toBeGreaterThan(oldResult.score)
  })

  it('should give citation bonus for highly cited papers', () => {
    const highCited = {
      title: 'Test Paper',
      abstract: null,
      year: 2020,
      citationCount: 1500,
    }
    const lowCited = {
      title: 'Test Paper',
      abstract: null,
      year: 2020,
      citationCount: 5,
    }
    const keywords = ['test']

    const highResult = calculateDiscoveryPriorityScore(highCited, keywords, currentYear)
    const lowResult = calculateDiscoveryPriorityScore(lowCited, keywords, currentYear)

    expect(highResult.score).toBeGreaterThan(lowResult.score)
  })

  it('should give bonus for abstract existence', () => {
    const withAbstract = {
      title: 'Test Paper',
      abstract: 'Some abstract text',
      year: 2020,
      citationCount: 10,
    }
    const withoutAbstract = {
      title: 'Test Paper',
      abstract: null,
      year: 2020,
      citationCount: 10,
    }
    const keywords = ['test']

    const withResult = calculateDiscoveryPriorityScore(withAbstract, keywords, currentYear)
    const withoutResult = calculateDiscoveryPriorityScore(withoutAbstract, keywords, currentYear)

    expect(withResult.score).toBeGreaterThan(withoutResult.score)
  })

  it('should give bonus for venue existence', () => {
    const withVenue = {
      title: 'Test Paper',
      abstract: null,
      year: 2020,
      citationCount: 10,
      venue: 'ACL',
    }
    const withoutVenue = {
      title: 'Test Paper',
      abstract: null,
      year: 2020,
      citationCount: 10,
      venue: '',
    }
    const keywords = ['test']

    const withResult = calculateDiscoveryPriorityScore(withVenue, keywords, currentYear)
    const withoutResult = calculateDiscoveryPriorityScore(withoutVenue, keywords, currentYear)

    expect(withResult.score).toBeGreaterThan(withoutResult.score)
  })

  it('should cap score at 100', () => {
    const paper = {
      title: 'Retrieval Augmented Generation',
      abstract: 'Retrieval augmented generation for NLP retrieval augmented generation',
      year: 2026,
      citationCount: 5000,
      venue: 'ACL',
    }
    const keywords = ['retrieval', 'augmented', 'generation']

    const result = calculateDiscoveryPriorityScore(paper, keywords, currentYear)

    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('should return generic reason when no matches', () => {
    const paper = {
      title: 'Unrelated Paper',
      abstract: null,
      year: 2010,
      citationCount: 0,
    }
    const keywords = ['retrieval', 'augmented']

    const result = calculateDiscoveryPriorityScore(paper, keywords, currentYear)

    expect(result.reason).toBe('通用匹配')
  })
})
