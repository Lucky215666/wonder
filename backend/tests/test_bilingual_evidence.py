from backend.rag.paper_types import (
    BilingualTerm,
    PaperChunk,
    chroma_safe_metadata,
    enrichment_embedding_text,
)
from backend.rag.bilingual_enrichment import (
    BilingualEnrichment,
    parse_bilingual_enrichment,
    fallback_bilingual_enrichment,
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


from backend.rag.indexer import DocumentIndexer


class FakeEmbedding:
    def embed(self, texts):
        self.texts = texts
        return [[float(i), 0.0, 0.0] for i, _ in enumerate(texts)]

    def embed_single(self, text):
        return [0.0, 0.0, 0.0]


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
    assert result.source_refs[0]["content"] == "The method estimates an illumination map."