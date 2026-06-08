# Bilingual Evidence RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build bilingual evidence enhancement so English paper chunks can be retrieved by Chinese, English, and mixed-language questions while all citations remain anchored to English source chunks.

**Architecture:** Extend the existing Python paper RAG pipeline. `PaperChunk` gains optional bilingual enrichment fields, the indexer writes both English source and Chinese enrichment retrieval entries that merge back to one `chunk_id`, the retriever normalizes bilingual queries and merges multi-path candidates, and evidence packs label Chinese helper text as non-citable. Literature analysis then consumes evidence-bound signals rather than raw free-form chunks.

**Tech Stack:** Python dataclasses, FastAPI backend agents, Chroma through `StorageManager`, existing embedding client, pytest, React/TypeScript frontend source-ref rendering.

---

## File Structure

- Modify `backend/rag/paper_types.py`: bilingual term/enrichment dataclasses, metadata serialization, enriched candidate score fields.
- Create `backend/rag/bilingual_enrichment.py`: prompt builder, JSON parser, deterministic fallback, enrichment text formatter.
- Create `backend/rag/query_normalizer.py`: bilingual query plan, lightweight section and term extraction.
- Modify `backend/rag/paper_chunker.py`: build English source embedding text and Chinese enrichment embedding text.
- Modify `backend/rag/indexer.py`: write `entry_kind=source` and `entry_kind=zh_enrichment` entries for enriched paper chunks.
- Modify `backend/rag/ranking.py`: merge multi-path candidates by `chunk_id`, score bilingual candidates, evidence pack with `source_text_en` and `zh_helper`.
- Modify `backend/rag/retriever.py`: query English source, Chinese enrichment, and legacy content paths; merge by chunk.
- Modify `backend/agents/qa.py`: strengthen prompt rule that `zh_helper` is not citable evidence.
- Modify `backend/agents/literature.py`: accept optional evidence chunks/signals and preserve `evidence_chunk_ids`.
- Modify `backend/agents/orchestrator.py`: pass evidence-bound analysis fields through analysis and QA outputs.
- Modify `src/components/AnalysisResult.tsx` and `src/pages/QA.tsx`: render bilingual terms/source refs when present.
- Create or extend backend tests:
  - `backend/tests/test_bilingual_evidence.py`
  - `backend/tests/test_query_normalizer.py`
  - `backend/tests/test_rag_ranking.py`
  - `backend/tests/test_rag_kb_scope.py`
  - `backend/tests/test_analysis_contract.py`

---

### Task 1: Add Bilingual Evidence Data Contract

**Files:**
- Modify: `backend/rag/paper_types.py`
- Test: `backend/tests/test_bilingual_evidence.py`

- [ ] **Step 1: Write failing tests for bilingual metadata serialization**

Create `backend/tests/test_bilingual_evidence.py` with:

```python
from backend.rag.paper_types import (
    BilingualTerm,
    PaperChunk,
    chroma_safe_metadata,
    enrichment_embedding_text,
)


def test_chroma_metadata_includes_compact_bilingual_fields():
    chunk = PaperChunk(
        chunk_id="c1",
        text="The method estimates an illumination map.",
        chunk_index=0,
        section_type="method",
        section_title="2 Method",
        page_start=2,
        page_end=3,
        zh_semantic_summary="该方法估计照明图。",
        zh_key_points=["估计照明图", "用于低光增强"],
        terms=[
            BilingualTerm(
                canonical_en="illumination map",
                zh="照明图",
                aliases=["illumination estimation"],
                term_type="concept",
            )
        ],
        evidence_roles=["method"],
        confidence_flags=["term_translation_uncertain"],
    )

    meta = chroma_safe_metadata(chunk)

    assert meta["source_language"] == "en"
    assert meta["zh_semantic_summary"] == "该方法估计照明图。"
    assert meta["zh_key_points"] == "估计照明图|用于低光增强"
    assert meta["terms_en"] == "illumination map"
    assert meta["terms_zh"] == "照明图"
    assert meta["term_aliases"] == "illumination estimation"
    assert meta["evidence_roles"] == "method"
    assert meta["confidence_flags"] == "term_translation_uncertain"


def test_enrichment_embedding_text_uses_only_helper_fields():
    chunk = PaperChunk(
        chunk_id="c1",
        text="The English source text should not be repeated here.",
        chunk_index=0,
        section_type="method",
        section_title="2 Method",
        page_start=2,
        page_end=2,
        zh_semantic_summary="该方法估计照明图。",
        zh_key_points=["低光增强", "结构感知约束"],
        terms=[
            BilingualTerm(
                canonical_en="structure-aware smoothing",
                zh="结构感知平滑",
                aliases=["structure-aware constraint"],
                term_type="method",
            )
        ],
        evidence_roles=["method"],
    )

    text = enrichment_embedding_text("LIME", chunk)

    assert "Title: LIME" in text
    assert "Chinese summary: 该方法估计照明图。" in text
    assert "Chinese key points: 低光增强; 结构感知约束" in text
    assert "Terms: structure-aware smoothing / 结构感知平滑" in text
    assert "The English source text should not be repeated here." not in text
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py -q
```

Expected: FAIL because `BilingualTerm` and `enrichment_embedding_text` are not defined.

- [ ] **Step 3: Add dataclasses and metadata serialization**

In `backend/rag/paper_types.py`, add near the other dataclasses:

```python
@dataclass(frozen=True)
class BilingualTerm:
    canonical_en: str
    zh: str
    aliases: list[str] = field(default_factory=list)
    term_type: str = "concept"
```

Extend `PaperChunk` with defaulted fields:

```python
source_language: str = "en"
zh_semantic_summary: str = ""
zh_key_points: list[str] = field(default_factory=list)
terms: list[BilingualTerm] = field(default_factory=list)
evidence_roles: list[str] = field(default_factory=list)
confidence_flags: list[str] = field(default_factory=list)
```

Add helpers below `PaperChunk`:

```python
def _join_scalar(values: list[str], sep: str = "|") -> str:
    return sep.join(str(value).strip() for value in values if str(value).strip())


def enrichment_embedding_text(paper_title: str | None, chunk: PaperChunk) -> str:
    title = paper_title or "Unknown"
    key_points = "; ".join(chunk.zh_key_points)
    terms = "; ".join(
        f"{term.canonical_en} / {term.zh}"
        for term in chunk.terms
        if term.canonical_en or term.zh
    )
    aliases = "; ".join(alias for term in chunk.terms for alias in term.aliases)
    roles = ", ".join(chunk.evidence_roles)
    parts = [
        f"Title: {title}",
        f"Section: {chunk.section_title or chunk.section_type or 'unknown'}",
        f"Chinese summary: {chunk.zh_semantic_summary}",
    ]
    if key_points:
        parts.append(f"Chinese key points: {key_points}")
    if terms:
        parts.append(f"Terms: {terms}")
    if aliases:
        parts.append(f"Aliases: {aliases}")
    if roles:
        parts.append(f"Evidence roles: {roles}")
    return "\n".join(part for part in parts if part.strip())
```

Update `chroma_safe_metadata()` by adding these keys:

```python
"source_language": chunk.source_language,
"zh_semantic_summary": chunk.zh_semantic_summary,
"zh_key_points": _join_scalar(chunk.zh_key_points),
"terms_en": _join_scalar([term.canonical_en for term in chunk.terms]),
"terms_zh": _join_scalar([term.zh for term in chunk.terms]),
"term_aliases": _join_scalar([alias for term in chunk.terms for alias in term.aliases]),
"term_types": _join_scalar([term.term_type for term in chunk.terms]),
"evidence_roles": _join_scalar(chunk.evidence_roles),
"confidence_flags": _join_scalar(chunk.confidence_flags),
```

- [ ] **Step 4: Run tests and update existing metadata expectation**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py backend/tests/test_paper_chunker.py -q
```

Expected: `test_bilingual_evidence.py` passes; `test_paper_chunker.py::test_chroma_safe_metadata_keeps_only_scalar_values` fails because the expected metadata dict lacks new keys.

Update that expected dict in `backend/tests/test_paper_chunker.py` to include empty defaults:

```python
"source_language": "en",
"zh_semantic_summary": "",
"zh_key_points": "",
"terms_en": "",
"terms_zh": "",
"term_aliases": "",
"term_types": "",
"evidence_roles": "",
"confidence_flags": "",
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py backend/tests/test_paper_chunker.py -q
```

Expected: PASS.

Commit:

```powershell
git add backend/rag/paper_types.py backend/tests/test_bilingual_evidence.py backend/tests/test_paper_chunker.py
git commit -m "feat: add bilingual evidence chunk metadata"
```

---

### Task 2: Add Bilingual Enrichment Parser And Fallback

**Files:**
- Create: `backend/rag/bilingual_enrichment.py`
- Test: `backend/tests/test_bilingual_evidence.py`

- [ ] **Step 1: Add failing parser tests**

Append to `backend/tests/test_bilingual_evidence.py`:

```python
from backend.rag.bilingual_enrichment import (
    BilingualEnrichment,
    parse_bilingual_enrichment,
    fallback_bilingual_enrichment,
)


def test_parse_bilingual_enrichment_accepts_json_fence():
    raw = """```json
{
  "zh_semantic_summary": "该片段说明方法流程。",
  "zh_key_points": ["方法流程", "低光增强"],
  "terms": [
    {
      "canonical_en": "illumination map",
      "zh": "照明图",
      "aliases": ["illumination estimation"],
      "term_type": "concept"
    }
  ],
  "evidence_roles": ["method"],
  "confidence_flags": ["weak_section"]
}
```"""

    enrichment = parse_bilingual_enrichment(raw)

    assert enrichment.zh_semantic_summary == "该片段说明方法流程。"
    assert enrichment.zh_key_points == ["方法流程", "低光增强"]
    assert enrichment.terms[0].canonical_en == "illumination map"
    assert enrichment.terms[0].zh == "照明图"
    assert enrichment.evidence_roles == ["method"]
    assert enrichment.confidence_flags == ["weak_section"]


def test_parse_bilingual_enrichment_returns_empty_on_invalid_json():
    enrichment = parse_bilingual_enrichment("not json")

    assert enrichment == BilingualEnrichment()


def test_fallback_bilingual_enrichment_marks_missing_model_output():
    enrichment = fallback_bilingual_enrichment(
        source_text="The method uses BLEU and ROUGE metrics.",
        section_type="experiment",
    )

    assert enrichment.zh_semantic_summary
    assert "experiment" in enrichment.evidence_roles
    assert "zh_summary_uncertain" in enrichment.confidence_flags
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py -q
```

Expected: FAIL because `backend.rag.bilingual_enrichment` does not exist.

- [ ] **Step 3: Implement parser and fallback**

Create `backend/rag/bilingual_enrichment.py`:

```python
import json
import re
from dataclasses import dataclass, field
from typing import Any

from backend.rag.paper_types import BilingualTerm


@dataclass(frozen=True)
class BilingualEnrichment:
    zh_semantic_summary: str = ""
    zh_key_points: list[str] = field(default_factory=list)
    terms: list[BilingualTerm] = field(default_factory=list)
    evidence_roles: list[str] = field(default_factory=list)
    confidence_flags: list[str] = field(default_factory=list)


def strip_json_fence(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _list_of_strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _parse_terms(value: Any) -> list[BilingualTerm]:
    if not isinstance(value, list):
        return []
    terms: list[BilingualTerm] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        canonical_en = str(item.get("canonical_en", item.get("canonicalEn", ""))).strip()
        zh = str(item.get("zh", "")).strip()
        aliases = _list_of_strings(item.get("aliases", []))
        term_type = str(item.get("term_type", item.get("termType", "concept"))).strip() or "concept"
        if canonical_en or zh:
            terms.append(BilingualTerm(canonical_en=canonical_en, zh=zh, aliases=aliases, term_type=term_type))
    return terms


def parse_bilingual_enrichment(raw: str) -> BilingualEnrichment:
    try:
        parsed = json.loads(strip_json_fence(raw))
    except (TypeError, ValueError, json.JSONDecodeError):
        return BilingualEnrichment()
    if not isinstance(parsed, dict):
        return BilingualEnrichment()
    return BilingualEnrichment(
        zh_semantic_summary=str(parsed.get("zh_semantic_summary", parsed.get("zhSemanticSummary", ""))).strip(),
        zh_key_points=_list_of_strings(parsed.get("zh_key_points", parsed.get("zhKeyPoints", []))),
        terms=_parse_terms(parsed.get("terms", [])),
        evidence_roles=_list_of_strings(parsed.get("evidence_roles", parsed.get("evidenceRoles", []))),
        confidence_flags=_list_of_strings(parsed.get("confidence_flags", parsed.get("confidenceFlags", []))),
    )


def fallback_bilingual_enrichment(source_text: str, section_type: str) -> BilingualEnrichment:
    summary = source_text.strip().replace("\n", " ")[:180]
    role = section_type if section_type else "unknown"
    flags = ["zh_summary_uncertain"]
    if role == "unknown":
        flags.append("weak_section")
    return BilingualEnrichment(
        zh_semantic_summary=f"该英文片段与 {role} 部分相关，需要依据原文核验：{summary}",
        zh_key_points=[],
        terms=[],
        evidence_roles=[role],
        confidence_flags=flags,
    )
```

- [ ] **Step 4: Verify and commit**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py -q
```

Expected: PASS.

Commit:

```powershell
git add backend/rag/bilingual_enrichment.py backend/tests/test_bilingual_evidence.py
git commit -m "feat: parse bilingual evidence enrichment"
```

---

### Task 3: Add Query Normalization

**Files:**
- Create: `backend/rag/query_normalizer.py`
- Test: `backend/tests/test_query_normalizer.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_query_normalizer.py`:

```python
from backend.rag.query_normalizer import normalize_query


def test_normalize_chinese_method_query_adds_english_expansion():
    plan = normalize_query("这篇论文的方法怎么做？")

    assert plan.query_zh == "这篇论文的方法怎么做？"
    assert "method" in plan.query_en_expansion
    assert "approach" in plan.query_en_expansion
    assert "method" in plan.section_intent


def test_normalize_mixed_query_extracts_terms():
    plan = normalize_query("LIME 的 illumination map refinement 用了什么约束？")

    assert "LIME" in plan.terms
    assert "illumination map refinement" in plan.terms
    assert "method" in plan.section_intent


def test_normalize_experiment_query_detects_metrics():
    plan = normalize_query("实验用了哪些 dataset 和 metric？")

    assert "dataset" in plan.query_en_expansion
    assert "metric" in plan.query_en_expansion
    assert "experiment" in plan.section_intent
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
uv run pytest backend/tests/test_query_normalizer.py -q
```

Expected: FAIL because `backend.rag.query_normalizer` does not exist.

- [ ] **Step 3: Implement lightweight normalizer**

Create `backend/rag/query_normalizer.py`:

```python
import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class BilingualQueryPlan:
    query_zh: str
    query_en_expansion: list[str] = field(default_factory=list)
    terms: list[str] = field(default_factory=list)
    section_intent: list[str] = field(default_factory=list)


INTENT_MARKERS = {
    "method": {
        "zh": ["方法", "怎么做", "流程", "结构", "模型", "算法", "约束"],
        "en": ["method", "approach", "pipeline", "architecture", "algorithm", "constraint", "model"],
    },
    "experiment": {
        "zh": ["实验", "数据集", "指标", "消融", "评估"],
        "en": ["experiment", "dataset", "metric", "ablation", "evaluation"],
    },
    "result": {
        "zh": ["结果", "效果", "表现", "性能"],
        "en": ["result", "performance", "finding"],
    },
    "limitation": {
        "zh": ["局限", "不足", "限制", "风险"],
        "en": ["limitation", "weakness", "risk"],
    },
}


def _dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def _extract_english_terms(query: str) -> list[str]:
    candidates = re.findall(r"[A-Za-z][A-Za-z0-9\-]*(?:\s+[A-Za-z][A-Za-z0-9\-]*)*", query)
    return [
        candidate.strip()
        for candidate in candidates
        if len(candidate.strip()) >= 2
    ]


def normalize_query(query: str) -> BilingualQueryPlan:
    q = query.strip()
    lower = q.lower()
    intents: list[str] = []
    expansion: list[str] = []
    for intent, markers in INTENT_MARKERS.items():
        zh_hit = any(marker in q for marker in markers["zh"])
        en_hit = any(marker in lower for marker in markers["en"])
        if zh_hit or en_hit:
            intents.append(intent)
            expansion.extend(markers["en"])
    return BilingualQueryPlan(
        query_zh=q,
        query_en_expansion=_dedupe(expansion),
        terms=_dedupe(_extract_english_terms(q)),
        section_intent=_dedupe(intents),
    )
```

- [ ] **Step 4: Verify and commit**

Run:

```powershell
uv run pytest backend/tests/test_query_normalizer.py -q
```

Expected: PASS.

Commit:

```powershell
git add backend/rag/query_normalizer.py backend/tests/test_query_normalizer.py
git commit -m "feat: normalize bilingual rag queries"
```

---

### Task 4: Index Chinese Enrichment Entries

**Files:**
- Modify: `backend/rag/paper_chunker.py`
- Modify: `backend/rag/indexer.py`
- Test: `backend/tests/test_bilingual_evidence.py`

- [ ] **Step 1: Add failing indexer test**

Append to `backend/tests/test_bilingual_evidence.py`:

```python
from backend.rag.indexer import DocumentIndexer


class FakeEmbedding:
    def embed(self, texts):
        self.texts = texts
        return [[float(i), 0.0, 0.0] for i, _ in enumerate(texts)]


class FakeStorage:
    def add_to_collection(self, ids, embeddings, metadatas, documents, collection_name=None):
        self.added = {
            "ids": ids,
            "embeddings": embeddings,
            "metadatas": metadatas,
            "documents": documents,
            "collection_name": collection_name,
        }


def test_indexer_writes_source_and_zh_enrichment_entries_for_paper_chunks():
    storage = FakeStorage()
    embedding = FakeEmbedding()
    indexer = DocumentIndexer(storage, embedding)
    chunk = PaperChunk(
        chunk_id="c1",
        text="The method estimates an illumination map.",
        chunk_index=0,
        section_type="method",
        section_title="2 Method",
        page_start=2,
        page_end=2,
        zh_semantic_summary="该方法估计照明图。",
        zh_key_points=["低光增强"],
        terms=[BilingualTerm(canonical_en="illumination map", zh="照明图", term_type="concept")],
        evidence_roles=["method"],
    )

    indexer.index_document(
        doc_id="doc-1",
        knowledge_base_id="kb-1",
        file_name="paper.pdf",
        file_path="paper.pdf",
        chunks=[],
        summary="summary",
        analysis_result={},
        paper_title="LIME",
        paper_chunks=[chunk],
    )

    metas = storage.added["metadatas"]
    source_meta = next(meta for meta in metas if meta.get("entry_kind") == "source")
    zh_meta = next(meta for meta in metas if meta.get("entry_kind") == "zh_enrichment")

    assert source_meta["chunk_id"] == "c1"
    assert source_meta["chunk_type"] == "content"
    assert zh_meta["chunk_id"] == "c1"
    assert zh_meta["chunk_type"] == "content"
    assert zh_meta["zh_semantic_summary"] == "该方法估计照明图。"
    assert len(storage.added["documents"]) == 4
    assert any("Chinese summary: 该方法估计照明图。" in text for text in storage.added["documents"])
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py::test_indexer_writes_source_and_zh_enrichment_entries_for_paper_chunks -q
```

Expected: FAIL because the indexer writes only one content entry per paper chunk and has no `entry_kind`.

- [ ] **Step 3: Re-export enrichment embedding builder from chunker**

In `backend/rag/paper_chunker.py`, import `enrichment_embedding_text`:

```python
from backend.rag.paper_types import PaperChunk, PaperDocument, enrichment_embedding_text
```

No wrapper is required; `indexer.py` can import it from `paper_types` directly.

- [ ] **Step 4: Update indexer text and metadata construction**

In `backend/rag/indexer.py`, change the imports:

```python
from backend.rag.paper_types import PaperChunk, chroma_safe_metadata, enrichment_embedding_text
```

Replace the `content_documents` and embedding preparation for `paper_chunks is not None` with:

```python
if paper_chunks is not None:
    source_documents = [build_embedding_text(paper_title or file_name, chunk) for chunk in paper_chunks]
    enrichment_documents = [
        enrichment_embedding_text(paper_title or file_name, chunk)
        for chunk in paper_chunks
        if chunk.zh_semantic_summary or chunk.zh_key_points or chunk.terms
    ]
    content_documents = source_documents
    texts_to_embed = [profile_text, summary] + source_documents + enrichment_documents
else:
    content_documents = chunks
    enrichment_documents = []
    texts_to_embed = [profile_text, summary] + content_documents
```

In the profile metadata add:

```python
"entry_kind": "profile",
```

In the summary metadata add:

```python
"entry_kind": "summary",
```

In the paper chunk loop, add source entries:

```python
ids.append(f"{doc_id}_{knowledge_base_id}_chunk_{i}_source")
paper_meta = chroma_safe_metadata(paper_chunk)
metadatas.append({
    "doc_id": doc_id,
    "knowledge_base_id": knowledge_base_id,
    "file_name": file_name,
    "paper_title": paper_title or "",
    "tags": ",".join(tags),
    "created_at": created_at,
    "index_id": index_id or "",
    "embedding_model": embedding_model or "",
    "embedding_dimensions": embedding_dimensions or 0,
    "entry_kind": "source",
    **paper_meta,
})
documents.append(source_documents[i])
```

After the source entry, add enrichment entries only when enrichment text is useful:

```python
if paper_chunk.zh_semantic_summary or paper_chunk.zh_key_points or paper_chunk.terms:
    ids.append(f"{doc_id}_{knowledge_base_id}_chunk_{i}_zh")
    metadatas.append({
        "doc_id": doc_id,
        "knowledge_base_id": knowledge_base_id,
        "file_name": file_name,
        "paper_title": paper_title or "",
        "tags": ",".join(tags),
        "created_at": created_at,
        "index_id": index_id or "",
        "embedding_model": embedding_model or "",
        "embedding_dimensions": embedding_dimensions or 0,
        "entry_kind": "zh_enrichment",
        **paper_meta,
    })
    documents.append(enrichment_embedding_text(paper_title or file_name, paper_chunk))
```

For legacy non-paper chunks, add:

```python
"entry_kind": "source",
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py backend/tests/test_paper_chunker.py -q
```

Expected: PASS.

Commit:

```powershell
git add backend/rag/indexer.py backend/rag/paper_chunker.py backend/tests/test_bilingual_evidence.py
git commit -m "feat: index bilingual evidence entries"
```

---

### Task 5: Merge Bilingual Retrieval Candidates

**Files:**
- Modify: `backend/rag/paper_types.py`
- Modify: `backend/rag/ranking.py`
- Test: `backend/tests/test_rag_ranking.py`

- [ ] **Step 1: Add failing ranking tests**

Append to `backend/tests/test_rag_ranking.py`:

```python
from backend.rag.ranking import merge_bilingual_candidates


def test_merge_bilingual_candidates_combines_scores_by_chunk_id():
    source = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="English source text",
        metadata={"chunk_id": "c1", "entry_kind": "source", "section_type": "method"},
        dense_score=0.7,
        lexical_score=0.1,
    )
    zh = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="中文辅助摘要",
        metadata={
            "chunk_id": "c1",
            "entry_kind": "zh_enrichment",
            "section_type": "method",
            "zh_semantic_summary": "中文辅助摘要",
        },
        dense_score=0.9,
        lexical_score=0.0,
    )

    merged = merge_bilingual_candidates([zh, source])

    assert len(merged) == 1
    assert merged[0].content == "English source text"
    assert merged[0].metadata["zh_semantic_summary"] == "中文辅助摘要"
    assert merged[0].source_dense_score == 0.7
    assert merged[0].zh_enrichment_score == 0.9
    assert merged[0].final_score > source.final_score


def test_merge_bilingual_candidates_keeps_legacy_candidate_without_entry_kind():
    legacy = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="legacy chunk",
        metadata={"chunk_id": "legacy-c1", "chunk_type": "content"},
        dense_score=0.6,
    )

    merged = merge_bilingual_candidates([legacy])

    assert len(merged) == 1
    assert merged[0].content == "legacy chunk"
    assert merged[0].source_dense_score == 0.6
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
uv run pytest backend/tests/test_rag_ranking.py -q
```

Expected: FAIL because bilingual score fields and `merge_bilingual_candidates` do not exist.

- [ ] **Step 3: Extend `RetrievalCandidate` scoring**

In `backend/rag/paper_types.py`, add fields to `RetrievalCandidate`:

```python
source_dense_score: float | None = None
zh_enrichment_score: float = 0.0
term_match_score: float = 0.0
```

Replace `final_score` with:

```python
@property
def final_score(self) -> float:
    source_score = self.source_dense_score
    if source_score is None:
        source_score = self.dense_score
    if self.zh_enrichment_score or self.term_match_score:
        return (
            0.35 * source_score
            + 0.25 * self.zh_enrichment_score
            + 0.20 * self.term_match_score
            + 0.15 * self.section_intent_score
            + 0.05 * self.metadata_score
        )
    return (
        0.55 * self.dense_score
        + 0.20 * self.lexical_score
        + 0.15 * self.section_intent_score
        + 0.05 * self.metadata_score
        + 0.05 * self.neighbor_bonus
    )
```

- [ ] **Step 4: Implement merge helper**

In `backend/rag/ranking.py`, add:

```python
def merge_bilingual_candidates(candidates: list[RetrievalCandidate]) -> list[RetrievalCandidate]:
    grouped: OrderedDict[tuple[str, str], dict[str, RetrievalCandidate]] = OrderedDict()
    for candidate in candidates:
        chunk_id = candidate.metadata.get("chunk_id") or candidate.content[:80]
        key = (candidate.doc_id, chunk_id)
        entry_kind = candidate.metadata.get("entry_kind") or "source"
        grouped.setdefault(key, {})
        previous = grouped[key].get(entry_kind)
        if previous is None or candidate.dense_score > previous.dense_score:
            grouped[key][entry_kind] = candidate

    merged: list[RetrievalCandidate] = []
    for entries in grouped.values():
        source = entries.get("source")
        zh = entries.get("zh_enrichment")
        base = source or zh
        if base is None:
            continue
        metadata = dict(base.metadata)
        if zh is not None:
            metadata.setdefault("zh_semantic_summary", zh.metadata.get("zh_semantic_summary", ""))
            metadata.setdefault("zh_key_points", zh.metadata.get("zh_key_points", ""))
            metadata.setdefault("terms_en", zh.metadata.get("terms_en", ""))
            metadata.setdefault("terms_zh", zh.metadata.get("terms_zh", ""))
        merged.append(RetrievalCandidate(
            doc_id=base.doc_id,
            file_name=base.file_name,
            content=source.content if source is not None else base.content,
            metadata=metadata,
            dense_score=base.dense_score,
            lexical_score=max((source.lexical_score if source else 0.0), (zh.lexical_score if zh else 0.0)),
            section_intent_score=max((source.section_intent_score if source else 0.0), (zh.section_intent_score if zh else 0.0)),
            metadata_score=max((source.metadata_score if source else 0.0), (zh.metadata_score if zh else 0.0)),
            neighbor_bonus=source.neighbor_bonus if source else 0.0,
            source_dense_score=source.dense_score if source else base.dense_score,
            zh_enrichment_score=zh.dense_score if zh else 0.0,
            term_match_score=max((source.term_match_score if source else 0.0), (zh.term_match_score if zh else 0.0)),
        ))
    return sorted(merged, key=lambda item: item.final_score, reverse=True)
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
uv run pytest backend/tests/test_rag_ranking.py -q
```

Expected: PASS.

Commit:

```powershell
git add backend/rag/paper_types.py backend/rag/ranking.py backend/tests/test_rag_ranking.py
git commit -m "feat: merge bilingual retrieval candidates"
```

---

### Task 6: Add Multi-Path Bilingual Retrieval

**Files:**
- Modify: `backend/rag/retriever.py`
- Test: `backend/tests/test_rag_kb_scope.py`
- Test: `backend/tests/test_bilingual_evidence.py`

- [ ] **Step 1: Add failing retriever test**

Append to `backend/tests/test_bilingual_evidence.py`:

```python
from backend.rag.retriever import RAGRetriever


class BilingualQueryStorage:
    def __init__(self):
        self.where_filters = []

    def query_collection(self, query_embeddings, n_results, where=None, collection_name=None):
        self.where_filters.append(where)
        if where and "$and" in where and {"entry_kind": "zh_enrichment"} in where["$and"]:
            return {
                "documents": [["Chinese summary: 该方法估计照明图。"]],
                "metadatas": [[{
                    "doc_id": "doc-1",
                    "file_name": "paper.pdf",
                    "chunk_id": "c1",
                    "chunk_type": "content",
                    "entry_kind": "zh_enrichment",
                    "section_type": "method",
                    "zh_semantic_summary": "该方法估计照明图。",
                    "terms_en": "illumination map",
                    "terms_zh": "照明图",
                }]],
                "distances": [[0.1]],
            }
        if where and "$and" in where and {"entry_kind": "source"} in where["$and"]:
            return {
                "documents": [["The method estimates an illumination map."]],
                "metadatas": [[{
                    "doc_id": "doc-1",
                    "file_name": "paper.pdf",
                    "chunk_id": "c1",
                    "chunk_type": "content",
                    "entry_kind": "source",
                    "section_type": "method",
                    "section_title": "2 Method",
                    "page_start": 2,
                    "page_end": 2,
                    "paper_title": "LIME",
                }]],
                "distances": [[0.3]],
            }
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}


def test_retriever_merges_chinese_enrichment_with_english_source():
    storage = BilingualQueryStorage()
    retriever = RAGRetriever(storage, FakeEmbedding())

    result = retriever.retrieve(
        query="这篇论文的方法怎么做？",
        knowledge_base_id="kb-1",
        top_k_docs=1,
        top_k_chunks=3,
    )

    assert result.chunks == ["The method estimates an illumination map."]
    assert "[S1]" in result.context
    assert "source_text_en:" in result.context
    assert "zh_helper:" in result.context
    assert result.source_refs[0]["content"] == "The method estimates an illumination map."
    assert result.source_refs[0]["zh_semantic_summary"] == "该方法估计照明图。"
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py::test_retriever_merges_chinese_enrichment_with_english_source -q
```

Expected: FAIL because retriever does not query `entry_kind=source` and `entry_kind=zh_enrichment` as separate paths.

- [ ] **Step 3: Import query normalization and merge helper**

In `backend/rag/retriever.py`, update imports:

```python
from backend.rag.query_normalizer import normalize_query
from backend.rag.ranking import (
    build_evidence_pack,
    lexical_score,
    merge_bilingual_candidates,
    rerank_candidates,
    section_intent_score,
)
```

- [ ] **Step 4: Add query helper for entry kinds**

Add a private helper inside `RAGRetriever`:

```python
def _query_content_by_entry_kind(
    self,
    query_embedding: List[float],
    collection_name: Optional[str],
    knowledge_base_id: Optional[str],
    doc_ids: Optional[List[str]],
    entry_kind: str,
    top_k_chunks: int,
) -> Dict:
    filters: List[Dict[str, Any]] = [
        {"chunk_type": "content"},
        {"entry_kind": entry_kind},
    ]
    if knowledge_base_id:
        filters.append({"knowledge_base_id": knowledge_base_id})
    if doc_ids:
        filters.append({"doc_id": {"$in": doc_ids}})
    return self.storage.query_collection(
        query_embeddings=[query_embedding],
        n_results=top_k_chunks,
        where={"$and": filters},
        collection_name=collection_name,
    )
```

- [ ] **Step 5: Score terms in `_result_to_candidates`**

Change `_result_to_candidates` signature:

```python
def _result_to_candidates(self, query: str, result: Dict, query_terms: Optional[List[str]] = None) -> List[RetrievalCandidate]:
```

Inside candidate construction, add:

```python
term_text = " ".join([
    str(meta.get("terms_en", "")),
    str(meta.get("terms_zh", "")),
    str(meta.get("term_aliases", "")),
    doc,
])
term_score = lexical_score(" ".join(query_terms or []), term_text) if query_terms else 0.0
```

Pass `term_match_score=term_score` to `RetrievalCandidate`.

- [ ] **Step 6: Query source and enrichment paths in `retrieve()`**

After `query_embedding = self.embedding.embed_single(query)`, add:

```python
query_plan = normalize_query(query)
expanded_query = " ".join([query, *query_plan.query_en_expansion, *query_plan.terms])
expanded_embedding = self.embedding.embed_single(expanded_query) if expanded_query != query else query_embedding
```

For the single-collection branch, after `_query_single_collection`, add:

```python
source_result = self._query_content_by_entry_kind(
    expanded_embedding, None, knowledge_base_id, doc_ids, "source", top_k_chunks
)
zh_result = self._query_content_by_entry_kind(
    query_embedding, None, knowledge_base_id, doc_ids, "zh_enrichment", top_k_chunks
)
```

Replace:

```python
candidates = self._result_to_candidates(query, chunks_result)
ranked_candidates = rerank_candidates(candidates)[:top_k_chunks]
```

With:

```python
candidates = []
candidates.extend(self._result_to_candidates(query, source_result, query_plan.terms))
candidates.extend(self._result_to_candidates(query, zh_result, query_plan.terms))
if not candidates:
    candidates.extend(self._result_to_candidates(query, chunks_result, query_plan.terms))
ranked_candidates = merge_bilingual_candidates(candidates)[:top_k_chunks]
if not ranked_candidates:
    ranked_candidates = rerank_candidates(candidates)[:top_k_chunks]
```

For the multi-collection branch, apply the same logic per collection and merge accumulated source/enrichment results before ranking.

- [ ] **Step 7: Verify retrieval behavior and existing scope tests**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py backend/tests/test_rag_kb_scope.py backend/tests/test_research_card_rag.py -q
```

Expected: PASS. If a fake storage in existing tests does not expect `entry_kind` filters, update it to return empty results for those filters and keep legacy chunk fallback behavior.

- [ ] **Step 8: Commit**

```powershell
git add backend/rag/retriever.py backend/tests/test_bilingual_evidence.py backend/tests/test_rag_kb_scope.py backend/tests/test_research_card_rag.py
git commit -m "feat: retrieve bilingual evidence paths"
```

---

### Task 7: Format Evidence Packs With Source Text And Chinese Helper

**Files:**
- Modify: `backend/rag/ranking.py`
- Modify: `backend/agents/qa.py`
- Test: `backend/tests/test_rag_ranking.py`
- Test: `backend/tests/test_research_card_rag.py`

- [ ] **Step 1: Add failing evidence pack test**

Append to `backend/tests/test_rag_ranking.py`:

```python
def test_build_evidence_pack_marks_zh_helper_as_non_citable():
    candidate = RetrievalCandidate(
        doc_id="d1",
        file_name="paper.pdf",
        content="The method estimates an illumination map.",
        metadata={
            "chunk_id": "c1",
            "chunk_type": "content",
            "paper_title": "LIME",
            "section_title": "2 Method",
            "section_type": "method",
            "page_start": 2,
            "page_end": 2,
            "zh_semantic_summary": "该方法估计照明图。",
        },
        dense_score=0.9,
    )

    context, refs = build_evidence_pack([candidate], max_chars=2000)

    assert "source_text_en:" in context
    assert "The method estimates an illumination map." in context
    assert "zh_helper:" in context
    assert "not independently citable" in context
    assert refs[0]["zh_semantic_summary"] == "该方法估计照明图。"
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
uv run pytest backend/tests/test_rag_ranking.py -q
```

Expected: FAIL because evidence pack writes raw candidate content without `source_text_en` and `zh_helper`.

- [ ] **Step 3: Update evidence pack block format**

In `backend/rag/ranking.py`, replace:

```python
block = f"{header}\n{candidate.content.strip()}"
```

With:

```python
zh_helper = str(meta.get("zh_semantic_summary") or "").strip()
helper_block = ""
if zh_helper:
    helper_block = (
        "\n\nzh_helper:\n"
        f"{zh_helper}\n"
        "(Chinese helper text for understanding only; not independently citable.)"
    )
block = f"{header}\n\nsource_text_en:\n{candidate.content.strip()}{helper_block}"
```

Add bilingual fields to refs:

```python
"zh_semantic_summary": meta.get("zh_semantic_summary", ""),
"zh_key_points": meta.get("zh_key_points", ""),
"terms_en": meta.get("terms_en", ""),
"terms_zh": meta.get("terms_zh", ""),
"term_aliases": meta.get("term_aliases", ""),
"evidence_roles": meta.get("evidence_roles", ""),
"confidence_flags": meta.get("confidence_flags", ""),
"entry_kind": meta.get("entry_kind", ""),
```

- [ ] **Step 4: Strengthen QA prompt**

In `backend/agents/qa.py`, add to `SYSTEM_PROMPT`:

```text
8. In evidence blocks, source_text_en is citable paper evidence. zh_helper is only an interpretation aid and must never be cited by itself.
9. If zh_helper conflicts with source_text_en, follow source_text_en.
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
uv run pytest backend/tests/test_rag_ranking.py backend/tests/test_research_card_rag.py -q
```

Expected: PASS. Update `test_orchestrator_passes_structured_evidence_context_to_qa` fixture context to include `source_text_en:` if needed.

Commit:

```powershell
git add backend/rag/ranking.py backend/agents/qa.py backend/tests/test_rag_ranking.py backend/tests/test_research_card_rag.py
git commit -m "feat: format bilingual evidence packs"
```

---

### Task 8: Bind Literature Analysis Signals To Evidence Chunks

**Files:**
- Modify: `backend/agents/literature.py`
- Modify: `backend/agents/orchestrator.py`
- Test: `backend/tests/test_analysis_contract.py`

- [ ] **Step 1: Add failing analysis contract test**

Append to `backend/tests/test_analysis_contract.py`:

```python
from backend.agents.literature import LiteratureParserAgent


def test_literature_signal_normalization_preserves_evidence_chunk_ids():
    signal = LiteratureParserAgent._normalize_signal(
        {
            "text": "论文方法依赖照明图估计。",
            "signal_type": "method",
            "section_type": "method",
            "evidence_hint": "illumination map",
            "evidence_chunk_ids": ["c1", "c2"],
            "source_terms": ["illumination map"],
            "confidence": "high",
        },
        chunk_index=0,
    )

    assert signal["evidence_chunk_ids"] == ["c1", "c2"]
    assert signal["source_terms"] == ["illumination map"]
    assert signal["confidence"] == "high"
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
uv run pytest backend/tests/test_analysis_contract.py::test_literature_signal_normalization_preserves_evidence_chunk_ids -q
```

Expected: FAIL because `_normalize_signal` drops these fields.

- [ ] **Step 3: Preserve evidence fields in signal normalization**

In `backend/agents/literature.py`, update `_normalize_signal`:

```python
evidence_ids = signal.get("evidence_chunk_ids", signal.get("evidenceChunkIds", []))
if not isinstance(evidence_ids, list):
    evidence_ids = []
source_terms = signal.get("source_terms", signal.get("sourceTerms", []))
if not isinstance(source_terms, list):
    source_terms = []
return {
    "text": str(signal.get("text", "")).strip(),
    "signal_type": str(signal.get("signal_type", signal.get("signalType", "unknown"))).strip() or "unknown",
    "section_type": str(signal.get("section_type", signal.get("sectionType", "unknown"))).strip() or "unknown",
    "chunk_index": chunk_index,
    "evidence_hint": str(signal.get("evidence_hint", signal.get("evidenceHint", ""))).strip(),
    "evidence_chunk_ids": [str(item).strip() for item in evidence_ids if str(item).strip()],
    "source_terms": [str(item).strip() for item in source_terms if str(item).strip()],
    "confidence": str(signal.get("confidence", "medium")).strip() or "medium",
}
```

- [ ] **Step 4: Add optional evidence-aware prompt path**

In `LiteratureParserAgent._extract_focused_chunk`, add an optional `evidence_chunk_id: str = ""` parameter and include this instruction in the JSON shape:

```text
      "evidence_chunk_ids": ["{evidence_chunk_id}"],
      "source_terms": ["source English term"],
      "confidence": "high|medium|low"
```

Add rules:

```text
- When an evidence chunk id is provided, include it in evidence_chunk_ids for every supported signal.
- Use source_terms for exact English methods, datasets, metrics, equations, figures, and model names.
```

Keep the existing `run(text_chunks=...)` signature working. Add a later implementation path to pass paper chunk IDs when analysis is called from indexed evidence.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
uv run pytest backend/tests/test_analysis_contract.py backend/tests/test_research_card_rag.py -q
```

Expected: PASS.

Commit:

```powershell
git add backend/agents/literature.py backend/agents/orchestrator.py backend/tests/test_analysis_contract.py
git commit -m "feat: preserve evidence ids in analysis signals"
```

---

### Task 9: Render Bilingual Source References

**Files:**
- Modify: `src/components/AnalysisResult.tsx`
- Modify: `src/pages/QA.tsx`
- Test: existing frontend tests if nearby coverage exists

- [ ] **Step 1: Inspect existing source-ref rendering**

Run:

```powershell
rg "source_refs|sourceRefs|section_title|sectionTitle|labels" src tests -n
```

Expected: find the source ref rendering path in `src/pages/QA.tsx` or a nested component, plus any normalizer tests.

- [ ] **Step 2: Add type fields**

Where the frontend source ref type is defined, add optional fields:

```ts
zh_semantic_summary?: string
zhSemanticSummary?: string
terms_en?: string
termsEn?: string
terms_zh?: string
termsZh?: string
confidence_flags?: string
confidenceFlags?: string
```

If the type is inline, update the inline type in the component that renders refs.

- [ ] **Step 3: Render bilingual terms without replacing English evidence**

In the source ref renderer, compute:

```ts
const termsEn = ref.terms_en ?? ref.termsEn ?? ''
const termsZh = ref.terms_zh ?? ref.termsZh ?? ''
const zhSummary = ref.zh_semantic_summary ?? ref.zhSemanticSummary ?? ''
```

Render under the existing title/section/page line:

```tsx
{(termsEn || termsZh) && (
  <div className="source-ref-terms">
    {termsZh && <span>{termsZh}</span>}
    {termsEn && <span className="source-ref-terms-en">({termsEn})</span>}
  </div>
)}
{zhSummary && (
  <div className="source-ref-helper">
    {zhSummary}
  </div>
)}
```

Use existing CSS classes and spacing patterns first. If no suitable classes exist, add compact styles to `src/styles/main.css`:

```css
.source-ref-terms {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.source-ref-terms-en {
  color: var(--text-tertiary);
}

.source-ref-helper {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}
```

- [ ] **Step 4: Run frontend checks**

Run:

```powershell
npm test -- --run
```

Expected: PASS. If the suite is too broad or slow, run the nearest test file shown by Step 1.

- [ ] **Step 5: Commit**

```powershell
git add src/components/AnalysisResult.tsx src/pages/QA.tsx src/styles/main.css
git commit -m "feat: show bilingual evidence refs"
```

---

### Task 10: Final Integration And Regression

**Files:**
- Modify only files needed by failing tests.
- Test: backend and frontend focused suites.

- [ ] **Step 1: Run backend focused suite**

Run:

```powershell
uv run pytest backend/tests/test_bilingual_evidence.py backend/tests/test_query_normalizer.py backend/tests/test_rag_ranking.py backend/tests/test_rag_kb_scope.py backend/tests/test_research_card_rag.py backend/tests/test_analysis_contract.py -q
```

Expected: PASS.

- [ ] **Step 2: Run existing Node route tests touched by source refs**

Run:

```powershell
npm test -- --run tests/server/routes/qa.test.ts tests/server/routes/knowledge-bases.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run typecheck or build check**

Run:

```powershell
npm run typecheck
```

Expected: PASS. If the project does not define `typecheck`, run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 4: Check final git diff**

Run:

```powershell
git status --short
git diff --stat
```

Expected: only bilingual evidence files and intentional test/UI updates are modified.

- [ ] **Step 5: Commit any final fixes**

If Step 1, Step 2, or Step 3 required fixes, commit them:

```powershell
git add backend src tests
git commit -m "test: verify bilingual evidence rag"
```

Skip this commit when there are no final fixes.

---

## Self-Review

Spec coverage:

- English source as truth source: Tasks 1, 4, 7.
- Chinese retrieval helper fields: Tasks 1, 2, 4.
- Bilingual query normalization: Task 3.
- English, Chinese, and term recall paths: Tasks 5 and 6.
- Evidence pack with non-citable helper text: Task 7.
- Literature analysis evidence binding: Task 8.
- Frontend visibility: Task 9.
- Compatibility and fallback: Tasks 5, 6, and 10.

Placeholder scan:

- No `TBD`, `implement later`, or unspecified test steps.
- Each code-changing task includes the target file, expected failing test, implementation snippet, verification command, and commit command.

Type consistency:

- Dataclass fields use snake_case in Python.
- Frontend accepts both snake_case API fields and camelCase normalized variants.
- Retrieval candidates use `entry_kind=source` and `entry_kind=zh_enrichment`, both merging by `chunk_id`.
