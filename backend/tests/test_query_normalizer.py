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