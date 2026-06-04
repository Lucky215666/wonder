# Knowledge QA RAG Mentions Design

## Context

Wonder already has the core knowledge QA path in place: a React QA page and store, Node QA session routes, a Python `/api/knowledge/ask` gateway, `RAGRetriever`, and `QAAgent`. The current path treats QA mainly as RAG-first. The next step is to make it feel like a research agent that can answer general questions naturally, while using RAG when the user points at specific papers or when retrieval finds useful evidence.

The knowledge base is built one paper at a time. In normal use, many user questions will not directly match stored papers. A missing RAG hit should not feel like an error. Direct paper-grounded behavior should happen when the user explicitly references one or more papers with `@`.

## Goals

- Use RAG to improve answers when relevant knowledge base material is available.
- Fall back naturally to the general model when no reliable knowledge base evidence is found.
- Support `@` mentions of one or more papers in the knowledge base.
- Treat mentioned papers as a strict per-message retrieval boundary.
- Keep answers concise to reduce token use and lower hallucination risk.
- Return clear source metadata so the UI can show which papers were actually used.

## Non-Goals

- Build a full multi-step autonomous agent loop.
- Add web search or external paper lookup.
- Replace the existing vector store or indexing architecture.
- Redesign the entire QA page.

## Product Behavior

Knowledge QA will support four answer modes.

### `general`

Used when the user did not mention papers and RAG has no reliable hit. The assistant answers like a general research assistant. It does not warn loudly that the knowledge base was not used. The source area shows that no knowledge base content was cited.

### `rag_enhanced`

Used when there is no explicit paper mention, but the current session scope or knowledge base produces reliable RAG results. The assistant answers with help from the retrieved material and the UI shows the cited papers and snippets.

### `mentioned_docs`

Used when the user mentions exactly one paper. The answer only searches and cites that paper. If the retrieved content is insufficient, the answer says that the available content from the mentioned paper is insufficient, then may add a short general explanation without presenting it as paper evidence.

### `compare_docs`

Used when the user mentions multiple papers. Retrieval is restricted to those papers. The answer should emphasize comparison, synthesis, differences, commonalities, and evidence gaps across the mentioned set.

## Mention Interaction

The QA input will support both inline `@` search and visible mention chips.

- Typing `@` opens a searchable paper picker.
- Search matches paper title and file name.
- Selected papers appear as chips above the input.
- Chips can be removed before sending.
- Sending a message submits both the cleaned question text and `mentionedDocIds`.
- After a successful send, the mention chips are cleared.
- If sending fails, the draft question and mentions remain available.

The `@` selection is per message, not a permanent session scope change.

## Output Constraints

All modes share these constraints:

- Prefer concise answers. Default target is about 800-1200 Chinese characters, and simple questions should be shorter.
- Do not fabricate paper findings, experimental results, datasets, or citations.
- Only display sources that were actually retrieved.
- If a statement is not supported by retrieved evidence, phrase it as general reasoning, hypothesis, or suggestion.
- Keep source usage small: at most 3 cited papers and at most 5 cited chunks in ordinary answers unless the user asks for a deeper review.

Mode-specific constraints:

- `general`: answer the question directly; do not imply the answer came from the knowledge base.
- `rag_enhanced`: prioritize retrieved chunks; unsupported claims must be qualified.
- `mentioned_docs`: only discuss the mentioned paper as evidence; if evidence is missing, say so briefly.
- `compare_docs`: use a structured comparison such as common points, differences, research implications, and evidence gaps; each paper should contribute no more than 2 key cited points by default.

## Backend Design

### Request Shape

Node QA message route accepts:

```ts
{
  question: string
  mentionedDocIds?: string[]
}
```

The Python knowledge QA request adds matching fields:

```py
mentioned_doc_ids: Optional[List[str]] = None
```

For compatibility, the existing `doc_ids` field remains supported. Node sends `mentionedDocIds` as the per-message override and may also map it to `doc_ids` for the current Python implementation.

### QA Policy

Add a small policy layer, preferably in Python near orchestration:

```py
{
  "answer_mode": "general" | "rag_enhanced" | "mentioned_docs" | "compare_docs",
  "retrieval_scope": {
    "knowledge_base_id": str | None,
    "doc_ids": list[str] | None,
    "strict_doc_scope": bool,
  },
  "limits": {
    "top_k_docs": int,
    "top_k_chunks": int,
    "max_context_chars": int,
    "max_answer_tokens": int,
  },
}
```

Policy rules:

- If `mentionedDocIds` has one item, mode is `mentioned_docs`, `doc_ids` is that one item, and `strict_doc_scope` is true.
- If `mentionedDocIds` has multiple items, mode is `compare_docs`, `doc_ids` is the mentioned set, and `strict_doc_scope` is true.
- If no papers are mentioned, use the session scope as today. RAG is a weak enhancement, not a requirement.
- If no papers are mentioned and retrieval is empty or below the confidence threshold, mode becomes `general`.
- If retrieval is reliable, mode becomes `rag_enhanced`.

### Retrieval Metadata

Extend `RAGRetriever` results to include structured source references:

```py
{
  "doc_id": str,
  "file_name": str,
  "chunk_id": str | None,
  "chunk_index": int | None,
  "chunk_type": "summary" | "content",
  "content": str,
  "score": float | None,
}
```

Keep existing `source_doc_ids` and `source_chunks` for compatibility, but add `source_refs` for better UI rendering and policy decisions.

The retriever should expose enough score or distance data for the policy to decide whether a result is reliable. The first implementation can use a conservative threshold and tune it later with real usage.

### QAAgent Prompting

Refactor `QAAgent` from one fixed prompt to:

- base research QA prompt,
- mode-specific prompt,
- output limit prompt,
- citation/source prompt.

This keeps behavior testable and lets the policy control how far the model may generalize.

## Frontend Design

Update the QA page and store with a narrow set of changes.

- Add `mentionedDocs` state for the current draft.
- Add paper search data loading from current knowledge base documents or global documents, depending on session scope.
- Add an `@` picker in the input.
- Render selected papers as removable chips above the input.
- Change `sendMessage(question)` to `sendMessage(question, mentionedDocIds)`.
- Display structured sources from `source_refs` when available, falling back to the current chunk list.
- Show a localized "no knowledge base sources cited" label when no sources were used.

## Error Handling

- If a mentioned paper no longer exists, the frontend blocks sending and asks the user to remove the stale chip.
- If a mentioned paper is not indexed yet, the system may answer generally but must not claim chunk evidence from that paper.
- If RAG retrieval fails and no strict mention was required, degrade to `general` with empty sources.
- If RAG retrieval fails for strict mentioned documents, answer with a brief evidence-unavailable message plus optional general context.
- If the LLM call fails, keep the user message behavior as today: do not persist a fake assistant answer, and allow retry.
- In `compare_docs`, if some mentioned papers have no retrieved evidence, list them under evidence gaps instead of inventing comparisons.

## Testing Plan

Node route tests:

- `mentionedDocIds` overrides session scope for the current message.
- One mentioned paper sends strict single-doc scope.
- Multiple mentioned papers sends strict compare scope.
- No mentions preserves existing session scope behavior.
- Sources persist with both existing and new response fields.

Python tests:

- Policy picks all four modes correctly.
- Weak retrieval with no reliable result falls back to `general`.
- Strict mentioned scope does not expand to other documents.
- Retriever returns `source_refs` with metadata and scores.
- QAAgent receives mode-specific prompt constraints.

Frontend tests:

- `@` picker selects papers and creates chips.
- Chips can be removed.
- Sending includes `mentionedDocIds`.
- Successful send clears chips.
- Failed send preserves the draft and selected chips.

## Rollout

Implement in small steps:

1. Add request and response shape support while preserving current behavior.
2. Add policy mode selection and output prompts.
3. Add retriever metadata and source rendering.
4. Add frontend `@` picker and mention chips.
5. Tune retrieval confidence thresholds after manual QA with real papers.

## Implementation Defaults

- Start with a conservative retrieval confidence setting and make it configurable in code, so it can be tuned after manual QA with the user's paper library.
- Reuse the existing document list APIs for paper search first. Add a dedicated search endpoint only if the library grows large enough to make client-side filtering slow.
