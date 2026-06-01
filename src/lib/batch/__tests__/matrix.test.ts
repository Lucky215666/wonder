import { describe, it, expect } from 'vitest'
import { extractMatrixRow, exportMatrixCSV, exportMatrixMarkdown, MATRIX_DIMENSIONS } from '../matrix'

const FULL_READING_CARD = `# Research Material Reading Card

## 1. Topic Summary
本文研究了基于大语言模型的问答系统。

## 2. Core Pain Points
如何在大规模知识库上实现高效准确的问答是当前的核心挑战。

## 3. Method/System Workflow
提出了基于RAG的两阶段检索增强生成方法，首先通过向量检索获取相关文档，然后利用LLM生成答案。

## 4. Datasets, Experiment Settings & Metrics
数据集：SQuAD 2.0 和 Natural Questions
指标：F1 Score, Exact Match (EM), BLEU-4

## 5. Main Conclusions
1. RAG方法显著优于纯生成方法
2. 检索质量是关键因素

## 6. Innovations or Reference Points
提出了自适应检索策略，可根据问题复杂度动态调整检索深度。

## 7. Limitations & Potential Issues
对长文档的处理效率有待提升，且依赖外部检索服务的可用性。

## 8. One-line Summary
RAG-based QA system with adaptive retrieval strategy.
`

describe('extractMatrixRow', () => {
  it('should extract all dimensions from full analysis result', () => {
    const result = extractMatrixRow('doc1', 'test.pdf', {
      summary: '本文研究了基于大语言模型的问答系统',
      readingCard: FULL_READING_CARD,
      noveltyForKnowledgeBase: '自适应检索策略具有创新性',
      writingAssets: {
        usableClaims: ['RAG方法优于纯生成方法'],
        methodReferences: [],
        theoryReferences: [],
        possibleLiteratureReviewUse: '可用于综述的检索增强生成部分',
        limitationsOrCritique: '效率问题',
      },
    })

    expect(result.documentId).toBe('doc1')
    expect(result.fileName).toBe('test.pdf')
    expect(result.research_question).not.toBe('-')
    expect(result.method).not.toBe('-')
    expect(result.dataset).not.toBe('-')
    expect(result.metrics).not.toBe('-')
    expect(result.innovation).not.toBe('-')
    expect(result.limitation).not.toBe('-')
    expect(result.reusable_idea).not.toBe('-')
  })

  it('should handle missing optional fields gracefully', () => {
    const result = extractMatrixRow('doc1', 'test.pdf', {
      summary: 'Simple summary',
      readingCard: '## 1. Topic Summary\nSomething',
    })

    expect(result.research_question).toBe('Simple summary')
    expect(result.method).toBe('-')
    expect(result.dataset).toBe('-')
    expect(result.innovation).toBe('-')
    expect(result.limitation).toBe('-')
  })

  it('should handle empty readingCard', () => {
    const result = extractMatrixRow('doc1', 'test.pdf', {
      summary: '摘要内容',
    })

    expect(result.research_question).toBe('摘要内容')
    expect(result.method).toBe('-')
  })

  it('should use summary as fallback for research_question', () => {
    const result = extractMatrixRow('doc1', 'test.pdf', {
      summary: '本文提出了一种新的深度学习方法用于图像分类。',
    })
    expect(result.research_question).toContain('深度学习方法')
  })

  it('should extract dataset from readingCard section 4', () => {
    const result = extractMatrixRow('doc1', 'test.pdf', {
      summary: 'test',
      readingCard: FULL_READING_CARD,
    })
    expect(result.dataset).toContain('SQuAD')
  })

  it('should extract metrics from readingCard section 4', () => {
    const result = extractMatrixRow('doc1', 'test.pdf', {
      summary: 'test',
      readingCard: FULL_READING_CARD,
    })
    expect(result.metrics).toContain('F1')
  })

  it('should prefer writingAssets.usableClaims for reusable_idea', () => {
    const result = extractMatrixRow('doc1', 'test.pdf', {
      summary: 'test',
      readingCard: FULL_READING_CARD,
      writingAssets: {
        usableClaims: ['具体可复用的方法论'],
        methodReferences: [],
        theoryReferences: [],
        possibleLiteratureReviewUse: '综述参考',
        limitationsOrCritique: '',
      },
    })
    expect(result.reusable_idea).toBe('具体可复用的方法论')
  })
})

describe('exportMatrixCSV', () => {
  it('should produce correct headers and rows', () => {
    const rows = [{
      documentId: 'doc1',
      fileName: 'test.pdf',
      research_question: 'How to do X',
      method: 'Method A',
      dataset: 'Dataset B',
      metrics: 'F1',
      innovation: 'Novel approach',
      limitation: 'Slow',
      reusable_idea: 'Idea 1',
    }]
    const csv = exportMatrixCSV(rows)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('File Name')
    expect(lines[0]).toContain('研究问题')
    expect(lines[1]).toContain('test.pdf')
    expect(lines[1]).toContain('How to do X')
  })

  it('should escape commas and quotes in values', () => {
    const rows = [{
      documentId: 'doc1',
      fileName: 'test, file.pdf',
      research_question: 'He said "hello"',
      method: '-',
      dataset: '-',
      metrics: '-',
      innovation: '-',
      limitation: '-',
      reusable_idea: '-',
    }]
    const csv = exportMatrixCSV(rows)
    expect(csv).toContain('"test, file.pdf"')
    expect(csv).toContain('"He said ""hello"""')
  })
})

describe('exportMatrixMarkdown', () => {
  it('should produce valid markdown table', () => {
    const rows = [{
      documentId: 'doc1',
      fileName: 'test.pdf',
      research_question: 'Question',
      method: 'Method',
      dataset: 'Dataset',
      metrics: 'Metrics',
      innovation: 'Innovation',
      limitation: 'Limitation',
      reusable_idea: 'Idea',
    }]
    const md = exportMatrixMarkdown(rows)
    expect(md).toContain('| 文档 |')
    expect(md).toContain('| --- |')
    expect(md).toContain('| test.pdf |')
  })

  it('should handle empty rows', () => {
    const md = exportMatrixMarkdown([])
    expect(md).toBe('_暂无数据_')
  })
})
