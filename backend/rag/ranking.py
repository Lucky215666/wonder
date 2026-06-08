import re
from collections import OrderedDict

from backend.rag.paper_types import RetrievalCandidate


def query_terms(query: str) -> list[str]:
    return [
        term.lower()
        for term in re.findall(r"[\w一-鿿]+", query)
        if len(term.strip()) >= 2
    ]


def lexical_score(query: str, text: str) -> float:
    terms = query_terms(query)
    if not terms:
        return 0.0
    haystack = text.lower()
    hits = sum(1 for term in terms if term in haystack)
    return hits / len(terms)


def section_intent_score(query: str, metadata: dict) -> float:
    q = query.lower()
    section = (metadata.get("section_type") or "").lower()
    intent_map = {
        "method": ["method", "algorithm", "architecture", "framework", "方法", "模型", "架构", "怎么设计"],
        "experiment": ["experiment", "dataset", "metric", "ablation", "实验", "数据集", "指标", "消融"],
        "result": ["result", "performance", "效果", "结果", "表现"],
        "introduction": ["motivation", "gap", "problem", "动机", "问题", "背景"],
        "related_work": ["related", "prior", "相关工作", "已有"],
        "discussion": ["limitation", "discussion", "局限", "限制", "讨论"],
        "conclusion": ["conclusion", "总结", "结论"],
    }
    for target, markers in intent_map.items():
        if section == target and any(marker in q for marker in markers):
            return 1.0
    return 0.0


def rerank_candidates(candidates: list[RetrievalCandidate]) -> list[RetrievalCandidate]:
    deduped: OrderedDict[tuple[str, str], RetrievalCandidate] = OrderedDict()
    for candidate in candidates:
        key = (candidate.doc_id, candidate.metadata.get("chunk_id") or candidate.content[:80])
        previous = deduped.get(key)
        if previous is None or candidate.final_score > previous.final_score:
            deduped[key] = candidate
    return sorted(deduped.values(), key=lambda item: item.final_score, reverse=True)


def page_span(meta: dict) -> str:
    start = int(meta.get("page_start") or 0)
    end = int(meta.get("page_end") or start)
    if start <= 0:
        return "unknown"
    return str(start) if start == end else f"{start}-{end}"


def _labels_from_meta(meta: dict) -> list[str]:
    raw = meta.get("labels") or ""
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    return [part.strip() for part in str(raw).split(",") if part.strip()]


def build_evidence_pack(
    candidates: list[RetrievalCandidate],
    *,
    max_chars: int,
    background: str = "",
) -> tuple[str, list[dict]]:
    parts = []
    if background.strip():
        parts.append("[Background]\n" + background.strip())
    evidence_parts = ["[Evidence]"]
    refs = []
    used = 0
    for idx, candidate in enumerate(candidates, start=1):
        meta = candidate.metadata
        source_id = f"S{idx}"
        title = meta.get("paper_title") or meta.get("title") or ""
        section = meta.get("section_title") or meta.get("section_type") or "unknown"
        pages = page_span(meta)
        header = (
            f"[{source_id}] file={candidate.file_name} title={title} "
            f"section={section} pages={pages} score={candidate.final_score:.3f}"
        )
        block = f"{header}\n{candidate.content.strip()}"
        if used + len(block) > max_chars:
            break
        evidence_parts.append(block)
        used += len(block)
        refs.append({
            "source_id": source_id,
            "doc_id": candidate.doc_id,
            "file_name": candidate.file_name,
            "chunk_id": meta.get("chunk_id"),
            "chunk_index": meta.get("chunk_index"),
            "chunk_type": meta.get("chunk_type", "content"),
            "content": candidate.content,
            "score": candidate.final_score,
            "section_type": meta.get("section_type", ""),
            "section_title": meta.get("section_title", ""),
            "page_start": meta.get("page_start"),
            "page_end": meta.get("page_end"),
            "paper_title": meta.get("paper_title") or None,
            "labels": _labels_from_meta(meta),
            "parser": meta.get("parser") or None,
        })
    parts.append("\n\n".join(evidence_parts))
    return "\n\n---\n\n".join(parts), refs


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