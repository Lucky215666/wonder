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