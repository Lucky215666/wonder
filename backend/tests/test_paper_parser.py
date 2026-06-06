import pytest

from backend.rag.paper_parser import parse_mineru_markdown, parse_pypdf_pages
from backend.rag.mineru_client import MinerUConfig, MinerUClient


MINERU_MD = """# A Paper About Retrieval

## Abstract
We study retrieval augmented generation.

## 1 Introduction
RAG combines retrieval and generation.

## 2 Method
The method uses dense and lexical recall.

## References
[1] Someone. A citation.
"""


def test_parse_mineru_markdown_extracts_sections_and_references():
    doc = parse_mineru_markdown(MINERU_MD, parser="mineru_precision")

    assert doc.title == "A Paper About Retrieval"
    assert doc.abstract == "We study retrieval augmented generation."
    assert doc.parser == "mineru_precision"
    assert [b.section_type for b in doc.blocks] == ["abstract", "introduction", "method", "references"]
    assert doc.blocks[-1].is_reference is True


def test_parse_pypdf_pages_preserves_page_numbers():
    doc = parse_pypdf_pages([
        (1, "A Paper\nAbstract\nThis paper studies RAG."),
        (2, "2 Method\nThe method uses chunking."),
    ])

    assert doc.parser == "pypdf"
    assert doc.pages[0].page_number == 1
    assert doc.blocks[0].page_start == 1
    assert doc.blocks[-1].page_start == 2


def test_mineru_client_calls_parser_with_correct_name():
    config = MinerUConfig()
    client = MinerUClient(config)

    doc = client.parse_markdown_result("# Title\n\n## Abstract\nContent", precision=True)
    assert doc.parser == "mineru_precision"

    doc2 = client.parse_markdown_result("# Title\n\n## Abstract\nContent", precision=False)
    assert doc2.parser == "mineru_agent"
