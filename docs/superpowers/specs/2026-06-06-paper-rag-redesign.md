# Paper Literature RAG Redesign

Date: 2026-06-06

## Goal

Optimize Wonder's RAG pipeline for PDF papers and literature data while keeping the current Python backend, SQLite metadata store, and Chroma vector store. The first implementation should make paper QA reliably traceable to parsed paper evidence without introducing a heavy new retrieval stack.

## Current State

The current paper flow is:

1. Node/Python extracts text from uploaded files.
2. `chunk_text()` splits text by fixed character windows.
3. `DocumentIndexer` stores `profile`, `summary`, and `content` entries in Chroma.
4. `RAGRetriever` retrieves summaries first, then content chunks from matched documents.
5. `QAAgent` receives a concatenated document excerpt and answers with evidence policy rules.

This is simple, but weak for papers because PDF layout, page numbers, sections, reference boundaries, tables, formulas, and figure captions are not preserved as structured indexing signals. Retrieval is mostly dense-vector based, reranking is minimal, and some Chinese labels in Python prompts/comments are currently mojibake, which can pollute generated context.

## Scope

In scope:

- PDF paper parsing through MinerU as the preferred parser.
- Local `pypdf` parsing as a fallback path.
- Paper-aware cleaning and section detection.
- Semantic paper chunking with section/page metadata.
- Chroma metadata enrichment while preserving the existing index architecture.
- Lightweight hybrid retrieval using dense vector score plus lexical and section-aware scoring.
- Rule-based reranking, neighboring chunk expansion, and evidence packaging.
- QA prompt restructuring so answers cite evidence blocks.

Out of scope for the first pass:

- Replacing Chroma.
- Adding a separate search service.
- Adding a heavy cross-encoder reranker.
- Full multimodal answer generation over extracted images.
- Reworking non-paper DOCX/TXT/MD ingestion beyond compatibility with the new interfaces.

## MinerU Integration

PDF parsing should use MinerU first. MinerU provides a token-based precision extract API that supports `/api/v4/extract/task` or `/api/v4/file-urls/batch`, returns a result zip, and supports Markdown/JSON outputs. It also provides an Agent lightweight API at `/api/v1/agent/parse/url` or `/api/v1/agent/parse/file`, with no token but stricter size/page limits and Markdown-only output.

Design:

- Add a `MinerUClient` abstraction in the Python backend.
- Configuration fields:
  - `mineru.enabled`
  - `mineru.apiToken`
  - `mineru.preferredMode`: `precision` or `agent`
  - `mineru.modelVersion`: default `vlm` for precision mode
  - `mineru.timeoutSeconds`
  - `mineru.pollIntervalSeconds`
- If `apiToken` is present, use precision mode.
- If no token is present and the file is small enough, optionally use Agent lightweight mode.
- If MinerU is disabled, rate limited, over limit, times out, or returns an unsupported result, fall back to local `pypdf`.
- Normalize MinerU outputs into one internal structure instead of leaking MinerU-specific JSON through the pipeline.

The internal output type should be:

```python
PaperDocument(
    title: str | None,
    authors: list[str],
    abstract: str | None,
    pages: list[PaperPage],
    blocks: list[PaperBlock],
    raw_markdown: str,
    parser: "mineru_precision" | "mineru_agent" | "pypdf",
)
```

Each block should include text, page span, block type, section title, and optional table/formula/figure-caption markers when MinerU provides them.

## Data Stage

The data stage should produce clean paper structure before indexing.

Cleaning rules:

- Preserve page numbers as metadata, not repeated body text.
- Merge broken PDF lines and hyphenated line breaks.
- Remove repeated page headers and footers when they appear across many pages.
- Normalize whitespace and obvious extraction artifacts.
- Keep table and formula text when MinerU extracts it as Markdown or structured content.
- Mark references and appendix sections instead of mixing them into normal content chunks.

Section detection:

- Detect common paper sections: abstract, introduction, related work, background, method, experiment, result, discussion, conclusion, references, appendix.
- Support numbered headings such as `1 Introduction`, `2.1 Method`, and Chinese equivalents where possible.
- Assign every block a `section_type`, `section_title`, `page_start`, and `page_end`.

References handling:

- Do not index references as normal evidence chunks by default.
- Store references as separate metadata or low-priority chunks only if needed later for citation-network features.
- Never let a reference list entry become evidence for a paper claim.

## Index Stage

Replace fixed character-only chunking for papers with semantic paper chunking.

Chunk rules:

- Chunk by section and paragraph boundaries first.
- Target 1200-1800 characters per chunk for dense retrieval.
- Use 150-250 characters of overlap only when a section is split.
- Keep small high-value blocks such as abstracts, table captions, figure captions, and conclusions intact.
- Preserve `prev_chunk_id` and `next_chunk_id` for neighbor expansion.

Chunk metadata:

- `doc_id`
- `knowledge_base_id`
- `file_name`
- `paper_title`
- `chunk_type`: `profile`, `summary`, `content`, `reference`
- `chunk_index`
- `section_type`
- `section_title`
- `page_start`
- `page_end`
- `parser`
- `is_reference`
- `prev_chunk_id`
- `next_chunk_id`
- `embedding_model`
- `embedding_dimensions`

Embedding text:

- Keep `profile` and `summary` entries.
- For each content chunk, prepend a compact evidence header before embedding:

```text
Title: ...
Section: ...
Pages: ...

<chunk body>
```

This improves retrieval for section-aware questions without changing the vector store.

## Retrieval And Post-Processing

Retrieval should no longer depend only on summary-gated dense search.

Pipeline:

1. Embed the user query once.
2. Retrieve candidate documents from `profile` and `summary`.
3. Retrieve content chunks directly across the scoped knowledge base or mentioned documents.
4. Compute lightweight lexical score for candidates based on query terms, title terms, section title, and body text.
5. Merge candidates from profile, summary, and content retrieval.
6. Deduplicate by `(doc_id, chunk_id)` and retain the best score.
7. Apply neighbor expansion for top content chunks by adding previous/next chunks when budget allows.
8. Rerank candidates with a rule-based scorer.
9. Build a compact evidence pack for generation.

First-pass rerank score:

```text
final_score =
  0.55 * dense_score +
  0.20 * lexical_score +
  0.15 * section_intent_score +
  0.05 * metadata_score +
  0.05 * neighbor_bonus
```

Section intent examples:

- Questions about method, algorithm, architecture, framework: boost `method`, `approach`, `model`, `implementation`.
- Questions about experiments, datasets, metrics, ablation: boost `experiment`, `result`, `evaluation`.
- Questions about motivation or gap: boost `abstract`, `introduction`, `related_work`.
- Questions about limitations: boost `discussion`, `conclusion`, `limitation`.

Evidence classification:

- Keep the existing `none`, `weak`, and `reliable` evidence policy.
- Base classification on reranked content chunks, not summaries alone.
- Do not count README/global profile as paper evidence.
- Do not count reference-list chunks as paper evidence.

## Generation Stage

Replace the current free-form document excerpt with a structured evidence pack.

Prompt context format:

```text
[Background]
<global profile and knowledge base README, explicitly non-evidence>

[Evidence]
[S1] file=<file> title=<title> section=<section> pages=<page_start-page_end> score=<score>
<chunk text>

[S2] ...
```

QA rules:

- Answer in Chinese.
- Cite evidence block IDs such as `[S1]` when making claims from papers.
- If no evidence block directly supports the answer, say the current materials do not contain direct evidence before giving general guidance.
- Never cite README/global profile as paper evidence.
- Never treat research cards as paper evidence unless linked source chunks support the claim.
- Prefer concise synthesis over copying long chunks.

Also fix mojibake labels in Python prompt/context-building code so Chinese evidence labels are readable and stable.

## API And Compatibility

The first implementation should preserve current public API behavior where possible:

- Existing `/api/knowledge/documents/gateway` remains available.
- Existing QA response fields remain available: `answer`, `source_doc_ids`, `source_chunks`, `source_refs`.
- New source refs may include section and page metadata.
- Existing documents can still be indexed with the old plain chunk list until reindexed.
- New paper-aware indexing can be opt-in internally based on parsed document structure.

## Testing

Unit tests:

- MinerU output normalization from Markdown/JSON-like fixtures.
- pypdf fallback path.
- paper section detection.
- references exclusion.
- semantic chunk sizing and metadata.
- hybrid score merge and dedupe.
- section intent reranking.
- evidence pack formatting.
- QA prompt includes evidence IDs and excludes background as evidence.

Integration tests:

- Index a small synthetic paper with abstract, method, experiment, conclusion, and references.
- Ask method-focused, experiment-focused, and unsupported questions.
- Verify citations point to content chunks with correct section/page metadata.
- Verify references are not used as evidence.

Regression tests:

- Existing knowledge base scope filters still apply.
- Mentioned-document strict scope still applies.
- Existing source refs still render in the frontend.

## Implementation Order

1. Add paper document/chunk data structures and normalization helpers.
2. Add MinerU client with precision/agent/fallback behavior.
3. Add paper cleaner and section detector.
4. Add paper semantic chunker.
5. Extend indexer metadata while preserving current collection strategy.
6. Add hybrid candidate merge, lexical scoring, neighbor expansion, and rule rerank.
7. Replace context formatting with evidence pack formatting.
8. Fix mojibake prompt/context labels.
9. Add focused tests and one synthetic paper integration test.

## Risks And Mitigations

- MinerU network/API failures: fallback to local parser and expose parser status in metadata.
- Precision API requires remote URL or upload flow: isolate this in `MinerUClient` so Node/Python upload details can change without touching chunking and retrieval.
- Agent lightweight API limits: use it only when file size/page count fits, otherwise use precision or fallback.
- Rerank weights may need tuning: keep weights centralized and covered by deterministic tests.
- Old indexed documents lack section metadata: retriever should treat missing metadata as neutral and continue working.
- Larger metadata payloads: keep Chroma metadata scalar and compact; store rich raw parse output separately only if needed.

## Approval

The selected approach is the paper-first engineering implementation:

- MinerU-first PDF parsing with pypdf fallback.
- Existing Chroma/SQLite architecture retained.
- Paper semantic chunking and enriched metadata.
- Lightweight hybrid retrieval and rule-based rerank.
- Structured evidence prompt for answer generation.
