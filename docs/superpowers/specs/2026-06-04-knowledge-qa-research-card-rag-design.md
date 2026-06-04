# Knowledge QA Research Card RAG Design

## Context

Wonder now supports knowledge QA with RAG, answer modes, source refs, and `@` mentions for strict paper-scoped questions. This makes answers more controllable, but the QA result is still mostly transient chat. To help graduate students build a reusable literature knowledge base, useful QA turns should become structured research cards that enrich the knowledge base and improve future RAG.

The goal is not to save chat logs. The goal is to convert valuable question-answer moments into first-class knowledge objects with evidence links, tags, knowledge type, and re-indexable content.

## Goals

- Let users turn valuable QA answers into editable research cards.
- Store cards as independent knowledge objects in a knowledge base.
- Preserve evidence links from cards back to source papers and retrieved snippets.
- Index cards so future RAG can retrieve the user's own synthesized knowledge.
- Improve RAG from two layers to three layers: cards, paper summaries, paper chunks.
- Keep all knowledge base updates auditable; do not auto-apply card-derived README changes.

## Non-Goals

- Replace paper-level analysis.
- Auto-write the knowledge base README without user review.
- Treat general-model answers as paper evidence.
- Build a full note-taking application outside the knowledge base workflow.

## Product Model

### Research Card

A research card is generated from one QA turn and then edited by the user before saving.

Fields:

- `question`: the user's question.
- `core_claims`: 1-3 concise conclusions.
- `evidence_refs`: source refs used in the answer, including paper id, file name, chunk id or chunk index, snippet text, and score when available.
- `linked_doc_ids`: one or more related papers.
- `knowledge_type`: one of `method`, `theory`, `finding`, `research_question`, `gap`, `limitation`, `writing_material`, or `other`.
- `tags`: short user-editable tags.
- `sub_direction`: optional research sub-direction inside the knowledge base.
- `validation_notes`: what still needs confirmation or deeper reading.
- `use_cases`: where this card may be useful later, such as literature review, experiment design, gap finding, or writing.
- `status`: `draft`, `saved`, or `archived`.

Cards are knowledge base-scoped. A card may link to zero papers, but cards without paper evidence must be clearly marked as not paper-supported.

## User Flow

1. User asks a question in knowledge QA.
2. Assistant answers with answer mode and source refs.
3. User clicks a "Save as research card" action on the assistant answer.
4. Backend creates a card draft from the question, answer, sources, answer mode, and current knowledge base/session scope.
5. Frontend opens an edit modal.
6. User reviews and edits claims, type, tags, sub-direction, validation notes, and use cases.
7. User saves.
8. System stores the card and indexes its embedding text.
9. System may create reviewable README/tag suggestions, but does not apply them automatically.

## Card Drafting Rules

The draft generator should compress and structure, not invent.

- It may only attribute claims to papers when source refs support them.
- For `general` answers, it must mark the card as `no_paper_evidence`.
- For `rag_enhanced`, `mentioned_docs`, and `compare_docs`, it should preserve all relevant source refs from the answer.
- It should limit `core_claims` to 1-3 items.
- It should produce short tags and a single best `knowledge_type`.
- It should always include `validation_notes`, even if the note is "source evidence appears sufficient for this limited claim".

## Three-Layer RAG

Current retrieval is mostly:

1. Paper summary layer.
2. Paper chunk layer.

Add a higher-priority research card layer:

1. **Research Card Layer**
   Retrieves the user's synthesized questions, claims, methods, gaps, limitations, and use cases. This is highest priority because it reflects the user's own knowledge structure.

2. **Paper Summary Layer**
   Locates relevant papers and gives broad paper-level context.

3. **Paper Chunk Layer**
   Retrieves original evidence snippets for grounding and verification.

## Retrieval Behavior

### No `@` Mentions

Retrieve cards first within the current knowledge base or session scope. If card hits are reliable, use them as primary context and pull linked paper refs or chunks for evidence support. If card hits are weak, fall back to existing paper summary/chunk retrieval. If neither layer is reliable, answer in `general` mode with no knowledge source claim.

### Single Paper Mention

Retrieve cards linked to the mentioned paper, then summary/chunks for that same paper. Do not retrieve cards or paper chunks outside the mentioned paper.

### Multiple Paper Mentions

Retrieve cards linked to any mentioned paper, then summary/chunks only for those papers. Use this for comparison and synthesis. The answer should indicate when one mentioned paper has card evidence but another only has raw paper evidence, or when a paper has no evidence.

### Card Hit Without Paper Evidence

A card can be used as "your previous synthesis" but not as paper fact. The answer must distinguish card-derived synthesis from paper-supported evidence.

## Card Embedding Text

Cards should be embedded using a purpose-built text representation, not raw JSON.

Format:

```text
Question: ...
Core claims: ...
Knowledge type: ...
Tags: ...
Sub-direction: ...
Use cases: ...
Linked papers: ...
Validation notes: ...
```

This improves retrieval for natural research questions such as:

- "What gaps have I already identified in this direction?"
- "Which methods can I borrow?"
- "Which papers support this hypothesis?"
- "What experiment design clues have I already collected?"

## Data Model

Add tables through migrations rather than editing only the base schema.

### `research_cards`

Columns:

- `id TEXT PRIMARY KEY`
- `knowledge_base_id TEXT NOT NULL`
- `question TEXT NOT NULL`
- `core_claims TEXT NOT NULL` as JSON array
- `knowledge_type TEXT NOT NULL`
- `tags TEXT NOT NULL DEFAULT '[]'` as JSON array
- `sub_direction TEXT`
- `validation_notes TEXT NOT NULL DEFAULT ''`
- `use_cases TEXT NOT NULL DEFAULT '[]'` as JSON array
- `answer_mode TEXT`
- `source_message_id TEXT`
- `status TEXT NOT NULL DEFAULT 'saved'`
- `no_paper_evidence INTEGER NOT NULL DEFAULT 0`
- `created_at TEXT DEFAULT CURRENT_TIMESTAMP`
- `updated_at TEXT DEFAULT CURRENT_TIMESTAMP`

### `research_card_evidence_refs`

Columns:

- `id TEXT PRIMARY KEY`
- `card_id TEXT NOT NULL`
- `document_id TEXT`
- `file_name TEXT`
- `chunk_id TEXT`
- `chunk_index INTEGER`
- `chunk_type TEXT`
- `snippet TEXT NOT NULL`
- `score REAL`
- `created_at TEXT DEFAULT CURRENT_TIMESTAMP`

### `research_card_vector_indexes`

Columns:

- `id TEXT PRIMARY KEY`
- `card_id TEXT NOT NULL`
- `knowledge_base_id TEXT NOT NULL`
- `backend TEXT NOT NULL DEFAULT 'chroma'`
- `collection_name TEXT NOT NULL`
- `embedding_provider TEXT`
- `embedding_model TEXT`
- `embedding_dimensions INTEGER`
- `status TEXT NOT NULL DEFAULT 'not_indexed'`
- `error TEXT`
- `indexed_at TEXT`
- `created_at TEXT DEFAULT CURRENT_TIMESTAMP`
- `updated_at TEXT DEFAULT CURRENT_TIMESTAMP`

## Vector Indexing

Card vectors should live in the same embedding-configuration collection strategy as documents, but with metadata that distinguishes them:

```json
{
  "item_type": "research_card",
  "card_id": "...",
  "knowledge_base_id": "...",
  "linked_doc_ids": "doc-a,doc-b",
  "knowledge_type": "method",
  "tags": "rag,retrieval,qa",
  "sub_direction": "retrieval-augmented generation"
}
```

Deletion and editing must update the card vector index:

- Save new card: insert card and add vector.
- Edit card: update card, mark old card index stale or replace vector.
- Archive/delete card: remove or ignore card vector in retrieval.

## Backend API

Add Node routes under:

```txt
/api/research-cards
```

Endpoints:

- `POST /draft-from-qa`: create a draft from `sessionId`, `messageId`, optional `knowledgeBaseId`, question, answer, sources, and answer mode.
- `POST /`: save a reviewed card and trigger indexing.
- `GET /knowledge-base/:kbId`: list cards in a knowledge base with filters for type, tag, paper, and status.
- `PATCH /:id`: edit a card and re-index it.
- `DELETE /:id`: archive or delete a card and remove/deactivate its vector.

Python should expose a draft generation endpoint or agent callable for card drafting. The LLM prompt must be conservative and evidence-aware.

## Frontend UX

### QA Page

Assistant messages get a "Save as research card" action.

Clicking it opens a card draft modal with:

- source answer preview,
- editable core claims,
- evidence refs preview,
- knowledge type selector,
- tag editor,
- sub-direction field,
- validation notes,
- use cases,
- save button.

For `general` answers, show a visible label that the card has no paper evidence.

### Knowledge Base Page

Add a "Research Cards" area to the selected knowledge base workspace.

Capabilities:

- list cards,
- filter by knowledge type, tag, linked paper, and status,
- open card detail,
- edit card,
- archive card,
- view evidence refs and jump to linked documents.

The page should help users see that a knowledge base contains not only papers, but also research questions, methods, findings, gaps, and writing materials.

## README And Tag Suggestions

After saving a card, the system may create suggestions:

- add tags to the knowledge base tag set,
- add card summary to README sections such as current questions, sub-directions, method clues, or debates and limitations.

These suggestions must use the existing review pattern: pending suggestions that the user accepts or rejects. No automatic README mutation.

## Error Handling

- If the source QA message is missing, drafting fails with a clear error.
- If source refs are empty, drafting is allowed but the card is marked `no_paper_evidence`.
- If a linked paper is deleted later, the card remains but evidence refs show the paper as unavailable.
- If card indexing fails, the card remains saved with index status `failed` and can be re-indexed.
- If draft generation fails, the UI lets the user create a blank card from the question and answer.

## Testing Plan

Node tests:

- create draft request validates message and sources,
- save card persists card and evidence refs,
- edit card triggers re-index status,
- archive/delete card removes it from default list,
- list filters by knowledge base, type, tag, and linked paper.

Python tests:

- draft generator marks general answers as no-paper-evidence,
- draft generator preserves source refs for RAG answers,
- card embedding text includes question, claims, type, tags, use cases, linked papers, and validation notes,
- card retriever respects knowledge base and mention scope.

Frontend tests:

- QA message "Save as research card" action opens draft modal,
- save sends edited card payload,
- general answer card shows no-paper-evidence label,
- knowledge base card list filters by type/tag.

RAG tests:

- no mention searches cards before paper summaries,
- single mention only retrieves cards linked to that paper,
- multiple mentions only retrieves cards linked to mentioned papers,
- card hit with no evidence is not presented as paper fact.

## Rollout

Implement in phases:

1. Add card storage and card CRUD without RAG changes.
2. Add draft-from-QA generation and QA page save flow.
3. Add card indexing and card retrieval.
4. Integrate card layer into QA RAG policy.
5. Add knowledge base card workspace and README suggestions.

This sequencing keeps the feature useful early while reducing risk to the existing QA path.
