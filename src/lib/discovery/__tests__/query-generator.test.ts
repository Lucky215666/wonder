import { describe, it, expect } from 'vitest'
import { extractKeywords, generateSuggestedQueries } from '../query-generator'
import type { DiscoveryContext } from '../../../types/discovery'

describe('extractKeywords', () => {
  it('should use KB name as primary keyword', () => {
    const keywords = extractKeywords('Retrieval Augmented Generation', '', '')

    expect(keywords[0]).toBe('Retrieval Augmented Generation')
  })

  it('should extract phrases from description', () => {
    const keywords = extractKeywords(
      'RAG',
      'A system for retrieval augmented generation over documents',
      ''
    )

    expect(keywords).toContain('RAG')
    expect(keywords).toContain('A system for retrieval augmented generation over documents')
  })

  it('should extract heading phrases from readme', () => {
    const readme = `# Research Project
## Transformer Architecture
### Data Collection Methods
We collect data from multiple sources.`

    const keywords = extractKeywords('Test', '', readme)

    expect(keywords).toContain('Research Project')
    expect(keywords).toContain('Transformer Architecture')
    expect(keywords).toContain('Data Collection Methods')
  })

  it('should filter out generic structural headings', () => {
    const readme = `## Introduction
## Methods
## Results
## Conclusion
## Transformer Architecture`

    const keywords = extractKeywords('Test', '', readme)

    const genericTerms = ['Introduction', 'Methods', 'Results', 'Conclusion']
    for (const term of genericTerms) {
      expect(keywords).not.toContain(term)
    }
    expect(keywords).toContain('Transformer Architecture')
  })

  it('should extract bold phrases from readme', () => {
    const readme = 'This project uses **retrieval augmented generation** and **transformer models**.'

    const keywords = extractKeywords('Test', '', readme)

    expect(keywords).toContain('retrieval augmented generation')
    expect(keywords).toContain('transformer models')
  })

  it('should prioritize name over readme', () => {
    const readme = `## Some Heading
**Some Bold**`

    const keywords = extractKeywords('My Research Topic', '', readme)

    expect(keywords[0]).toBe('My Research Topic')
  })

  it('should limit to 15 keywords', () => {
    const readme = Array.from({ length: 30 }, (_, i) => `## Heading Phrase ${i}`).join('\n')

    const keywords = extractKeywords('Test', '', readme)

    expect(keywords.length).toBeLessThanOrEqual(15)
  })

  it('should deduplicate keywords', () => {
    const readme = `## Research
**Research**`

    const keywords = extractKeywords('Test', '', readme)

    const researchCount = keywords.filter(k => k.toLowerCase() === 'research').length
    expect(researchCount).toBe(1)
  })
})

describe('generateSuggestedQueries', () => {
  it('should use name as core topic query', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'Retrieval Augmented Generation',
      keywords: ['Retrieval Augmented Generation', 'transformer'],
    }

    const queries = generateSuggestedQueries(context)

    expect(queries[0]).toBe('Retrieval Augmented Generation')
  })

  it('should generate keyword queries from remaining keywords', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'NLP',
      keywords: ['NLP', 'transformer', 'attention', 'bert'],
    }

    const queries = generateSuggestedQueries(context)

    expect(queries).toContain('transformer')
    expect(queries).toContain('attention')
    expect(queries).toContain('bert')
  })

  it('should generate sub-direction queries', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'NLP',
      keywords: ['NLP', 'transformer', 'attention', 'bert'],
    }

    const queries = generateSuggestedQueries(context)

    const subDirectionQueries = queries.filter(q => q.includes('NLP') && q !== 'NLP')
    expect(subDirectionQueries.length).toBeGreaterThan(0)
  })

  it('should generate survey query', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'NLP',
      keywords: ['NLP', 'transformer'],
    }

    const queries = generateSuggestedQueries(context)

    const surveyQueries = queries.filter(q => q.includes('survey'))
    expect(surveyQueries.length).toBeGreaterThan(0)
  })

  it('should generate recent papers query', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'NLP',
      keywords: ['NLP', 'transformer'],
    }

    const queries = generateSuggestedQueries(context)

    const currentYear = new Date().getFullYear()
    const recentQuery = queries.find(q => q.includes(currentYear.toString()))
    expect(recentQuery).toBeDefined()
  })

  it('should use name when no keywords', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'Retrieval Augmented Generation',
      keywords: [],
    }

    const queries = generateSuggestedQueries(context)

    expect(queries[0]).toBe('Retrieval Augmented Generation')
  })

  it('should limit to 8 queries', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'NLP',
      keywords: ['NLP', 'transformer', 'attention', 'bert', 'gpt', 'llm'],
    }

    const queries = generateSuggestedQueries(context)

    expect(queries.length).toBeLessThanOrEqual(8)
  })

  it('should deduplicate queries', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'transformer',
      keywords: ['transformer'],
    }

    const queries = generateSuggestedQueries(context)

    const uniqueQueries = [...new Set(queries)]
    expect(queries.length).toBe(uniqueQueries.length)
  })
})
