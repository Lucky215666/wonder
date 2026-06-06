from backend.rag.paper_cleaner import clean_and_label_paper
from backend.rag.paper_types import PaperBlock, PaperDocument, PaperPage


def test_cleaner_assigns_sections_and_marks_references():
    doc = PaperDocument(
        document_id="doc-1",
        file_name="paper.pdf",
        title="Paper",
        authors=[],
        abstract=None,
        pages=[PaperPage(1, "text")],
        raw_markdown="",
        parser="mineru_precision",
        blocks=[
            PaperBlock(block_type="heading", text="1 Introduction", page_start=1, page_end=1, order=0),
            PaperBlock(block_type="paragraph", text="This paper studies low light.", page_start=1, page_end=1, order=1),
            PaperBlock(block_type="heading", text="2.2 Illumination Map Refinement", page_start=2, page_end=2, order=2),
            PaperBlock(block_type="paragraph", text="The method uses structure-aware smoothing.", page_start=2, page_end=2, order=3),
            PaperBlock(block_type="heading", text="References", page_start=5, page_end=5, order=4),
            PaperBlock(block_type="paragraph", text="[1] A cited paper.", page_start=5, page_end=5, order=5),
        ],
    )

    cleaned = clean_and_label_paper(doc)

    assert cleaned.blocks[1].section_type == "introduction"
    assert cleaned.blocks[1].section_title == "1 Introduction"
    assert cleaned.blocks[3].section_type == "method"
    assert cleaned.blocks[3].section_title == "2.2 Illumination Map Refinement"
    assert cleaned.blocks[5].is_reference is True
    assert cleaned.blocks[5].section_type == "reference"


def test_cleaner_merges_hyphenated_line_breaks():
    doc = PaperDocument(
        document_id="doc-1",
        file_name="paper.pdf",
        title=None,
        authors=[],
        abstract=None,
        pages=[PaperPage(1, "struc-\nture aware")],
        raw_markdown="",
        parser="pypdf",
        blocks=[
            PaperBlock(text="struc-\nture aware smoothing\nimproves illumination", page_start=1, page_end=1, order=0),
        ],
    )

    cleaned = clean_and_label_paper(doc)

    assert cleaned.blocks[0].text == "structure aware smoothing improves illumination"