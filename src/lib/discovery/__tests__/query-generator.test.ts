import { describe, it, expect } from 'vitest'
import { extractKeywords, generateSuggestedQueries } from '../query-generator'
import type { DiscoveryContext } from '../../../types/discovery'

describe('extractKeywords', () => {
  it('should extract keywords from headings', () => {
    const readme = `# Research Project
## Methodology
### Data Collection
We collect data from multiple sources.`

    const keywords = extractKeywords(readme)

    expect(keywords).toContain('research')
    expect(keywords).toContain('project')
    expect(keywords).toContain('methodology')
    expect(keywords).toContain('data')
    expect(keywords).toContain('collection')
  })

  it('should extract keywords from bold text', () => {
    const readme = `This project uses **retrieval augmented generation** and **transformer models**.`

    const keywords = extractKeywords(readme)

    expect(keywords).toContain('retrieval')
    expect(keywords).toContain('augmented')
    expect(keywords).toContain('generation')
    expect(keywords).toContain('transformer')
    expect(keywords).toContain('models')
  })

  it('should extract code terms', () => {
    const readme = 'Use the \`searchPapers\` function to query the API.'

    const keywords = extractKeywords(readme)

    expect(keywords).toContain('searchPapers')
  })

  it('should filter out stopwords', () => {
    const readme = '# This is the Project Title'

    const keywords = extractKeywords(readme)

    expect(keywords).not.toContain('this')
    expect(keywords).not.toContain('the')
    expect(keywords).toContain('project')
    expect(keywords).toContain('title')
  })

  it('should limit to 20 keywords', () => {
    const readme = Array.from({ length: 30 }, (_, i) => `## Heading ${i} keyword${i}`).join('\n')

    const keywords = extractKeywords(readme)

    expect(keywords.length).toBeLessThanOrEqual(20)
  })

  it('should deduplicate keywords', () => {
    const readme = `# Research
## Research Methods
**Research** methodology`

    const keywords = extractKeywords(readme)

    const researchCount = keywords.filter(k => k === 'research').length
    expect(researchCount).toBe(1)
  })
})

describe('generateSuggestedQueries', () => {
  it('should generate core topic query', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'Retrieval Augmented Generation',
      keywords: ['retrieval', 'augmented', 'generation'],
    }

    const queries = generateSuggestedQueries(context)

    expect(queries.length).toBeGreaterThan(0)
    expect(queries[0]).toContain('retrieval')
  })

  it('should generate keyword queries', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'NLP',
      keywords: ['transformer', 'attention', 'bert'],
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
      keywords: ['transformer', 'attention', 'bert'],
    }

    const queries = generateSuggestedQueries(context)

    const subDirectionQueries = queries.filter(q => q.includes('transformer') && q !== 'transformer')
    expect(subDirectionQueries.length).toBeGreaterThan(0)
  })

  it('should generate method-focused queries', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'NLP',
      keywords: ['transformer'],
    }

    const queries = generateSuggestedQueries(context)

    const methodQueries = queries.filter(q => q.includes('method') || q.includes('framework'))
    expect(methodQueries.length).toBeGreaterThan(0)
  })

  it('should generate recent papers query', () => {
    const context: DiscoveryContext = {
      mode: 'manual',
      name: 'NLP',
      keywords: ['transformer'],
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
      keywords: ['transformer', 'attention', 'bert', 'gpt', 'llm'],
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
