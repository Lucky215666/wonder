import type { AnalysisResult } from '../../types/analysis'

/**
 * Normalize raw analysis data to the canonical camelCase AnalysisResult type.
 * Supports three input shapes:
 *   1. Nested: { literature, relation, writing, readmeSuggestions }
 *   2. Flat snake_case (Python backend direct output)
 *   3. Flat camelCase (SSE complete event / old records)
 * Returns null for invalid or unrecognizable input.
 */
export function normalizeAnalysisResult(input: unknown): AnalysisResult | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  const raw = input as Record<string, unknown>

  // 1. Legacy nested format
  if (raw.literature && typeof raw.literature === 'object') {
    const lit = raw.literature as Record<string, unknown>
    const rel = (raw.relation || {}) as Record<string, unknown>
    const wri = (raw.writing || {}) as Record<string, unknown>
    return {
      summary: (lit.summary as string) || '',
      paperTitle: (raw.paperTitle as string) || (raw.paper_title as string) || undefined,
      readingCard: (lit.readingCard as string) || '',
      knowledgeBaseFitScore: lit.fitScore as number | undefined,
      fitReason: lit.fitReason as string | undefined,
      recommendedAction: lit.action as AnalysisResult['recommendedAction'],
      tags: lit.tags as string[] | undefined,
      relationToExistingDocs: rel.relationToExistingDocs as AnalysisResult['relationToExistingDocs'],
      relationAnalysis: rel.relationAnalysis as string | undefined,
      writingAssets: wri.writingAssets as AnalysisResult['writingAssets'],
      writingMaterials: wri.writingMaterials as string | undefined,
      readmeUpdateSuggestions: raw.readmeSuggestions as AnalysisResult['readmeUpdateSuggestions'],
      todoList: (raw.todo_list as string) || (lit.todoList as string) || undefined,
      matchScore: lit.matchScore as number | undefined,
      matchReason: lit.matchReason as string | undefined,
    }
  }

  // Must have at least one recognizable flat field
  if (!('reading_card' in raw) && !('readingCard' in raw) && !('summary' in raw)) {
    return null
  }

  // 2 & 3. Flat format — snake_case and camelCase
  const fitScore = (raw.fit_score as number) ?? (raw.knowledgeBaseFitScore as number) ?? undefined
  const fitReason = (raw.fit_reason as string) || (raw.fitReason as string) || undefined
  const relationType = (raw.relation_type as string) || (raw.relationType as string) || undefined

  return {
    summary: (raw.summary as string) || '',
    paperTitle: (raw.paperTitle as string) || (raw.paper_title as string) || undefined,
    readingCard: (raw.reading_card as string) || (raw.readingCard as string) || '',
    knowledgeBaseFitScore: fitScore,
    fitReason,
    relationToExistingDocs: raw.relationToExistingDocs || (relationType ? {
      type: relationType as AnalysisResult['relationToExistingDocs'] extends { type: infer T } ? T : never,
      reason: fitReason || '',
      relatedDocumentIds: [],
    } : undefined),
    relationAnalysis: (raw.relation_analysis as string) || (raw.relationAnalysis as string) || undefined,
    writingMaterials: (raw.writing_materials as string) || (raw.writingMaterials as string) || undefined,
    todoList: (raw.todo_list as string) || (raw.todoList as string) || undefined,
    matchScore: fitScore,
    matchReason: fitReason,
    tags: raw.tags as string[] | undefined,
    recommendedAction: (raw.recommended_action as string) || (raw.recommendedAction as string) || undefined,
    suggestedPlacement: (raw.suggestedPlacement as AnalysisResult['suggestedPlacement'])
      || (raw.suggested_placement ? {
        subDirection: (raw.suggested_placement as { sub_direction: string; tags: string[] }).sub_direction || '',
        tags: (raw.suggested_placement as { sub_direction: string; tags: string[] }).tags || [],
      } : undefined),
    noveltyForKnowledgeBase: (raw.noveltyForKnowledgeBase as string) || (raw.novelty_for_kb as string) || undefined,
    readmeUpdateSuggestions: (raw.readmeUpdateSuggestions as AnalysisResult['readmeUpdateSuggestions'])
      || (raw.readme_suggestions as AnalysisResult['readmeUpdateSuggestions']) || undefined,
    writingAssets: (raw.writingAssets as AnalysisResult['writingAssets'])
      || (raw.writing_assets ? {
        usableClaims: (raw.writing_assets as { usable_claims: string[] }).usable_claims || [],
        methodReferences: (raw.writing_assets as { method_references: string[] }).method_references || [],
        theoryReferences: (raw.writing_assets as { theory_references: string[] }).theory_references || [],
        possibleLiteratureReviewUse: (raw.writing_assets as { possible_literature_review_use: string }).possible_literature_review_use || '',
        limitationsOrCritique: (raw.writing_assets as { limitations_or_critique: string }).limitations_or_critique || '',
      } : undefined),
  } as AnalysisResult
}
