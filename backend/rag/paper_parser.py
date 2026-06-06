import re
from typing import Iterable, Literal

from backend.rag.paper_types import PaperBlock, PaperDocument, PaperPage

SECTION_ALIASES = [
    ("abstract", re.compile(r"^(abstract|摘要)$", re.I)),
    ("introduction", re.compile(r"^(\d+(\.\d+)?\s+)?(introduction|引言|绪论)$", re.I)),
    ("related_work", re.compile(r"^(\d+(\.\d+)?\s+)?(related work|background|本关工作|背景)$", re.I)),
    ("method", re.compile(r"^(\d+(\.\d+)?\s+)?(method|methods|approach|model|framework|方法|模型|框架)$", re.I)),
    ("experiment", re.compile(r"^(\d+(\.\d+)?\s+)?(experiment|experiments|evaluation|实验|评估)$", re.I)),
    ("result", re.compile(r"^(\d+(\.\d+)?\s+)?(result|results|analysis|结果|分析)$", re.I)),
    ("discussion", re.compile(r"^(\d+(\.\d+)?\s+)?(discussion|limitation|limitations|讨论|局限)$", re.I)),
    ("conclusion", re.compile(r"^(\d+(\.\d+)?\s+)?(conclusion|conclusions|总结|结论)$", re.I)),
    ("references", re.compile(r"^(references|bibliography|参考文献)$", re.I)),
    ("appendix", re.compile(r"^(appendix|附录)$", re.I)),
]


def detect_section_type(title: str) -> str:
    normalized = title.strip().strip("#").strip()
    for section_type, pattern in SECTION_ALIASES:
        if pattern.match(normalized):
            return section_type
    return "unknown"


def _clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"-\n(?=[a-zA-Z])", "", text)
    text = re.sub(r"(?<![.!?:;。！？：；])\n(?!\n|#|\d+(\.\d+)?\s)", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_mineru_markdown(
    markdown: str,
    *,
    parser: Literal["mineru_precision", "mineru_agent"],
) -> PaperDocument:
    raw = markdown or ""
    title = None
    blocks: list[PaperBlock] = []
    current_title = ""
    current_type = "unknown"
    current_lines: list[str] = []

    def flush() -> None:
        nonlocal current_lines
        text = _clean_text("\n".join(current_lines))
        if not text:
            current_lines = []
            return
        blocks.append(PaperBlock(
            text=text,
            section_type=current_type,
            section_title=current_title,
            is_reference=current_type == "references",
        ))
        current_lines = []

    for line in raw.splitlines():
        stripped = line.strip()
        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            flush()
            heading_text = heading.group(2).strip()
            if title is None and heading.group(1) == "#":
                title = heading_text
                current_title = heading_text
                current_type = "title"
            else:
                current_title = heading_text
                current_type = detect_section_type(heading_text)
            continue
        if stripped:
            current_lines.append(stripped)
    flush()

    abstract = next((b.text for b in blocks if b.section_type == "abstract"), None)
    return PaperDocument(
        title=title,
        authors=[],
        abstract=abstract,
        pages=[],
        blocks=[b for b in blocks if b.section_type != "title"],
        raw_markdown=raw,
        parser=parser,
    )


def parse_pypdf_pages(page_texts: Iterable[tuple[int, str]]) -> PaperDocument:
    pages = [PaperPage(page_number=n, text=_clean_text(text)) for n, text in page_texts]
    title = None
    blocks: list[PaperBlock] = []
    current_section = "unknown"
    current_title = ""

    for page in pages:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", page.text) if p.strip()]
        for paragraph in paragraphs:
            first_line = paragraph.splitlines()[0].strip()
            detected = detect_section_type(first_line)
            if title is None and len(first_line) > 8 and detected == "unknown":
                title = first_line
            if detected != "unknown":
                current_section = detected
                current_title = first_line
                body = paragraph[len(first_line):].strip()
                if body:
                    paragraph = body
                else:
                    paragraph = first_line
            blocks.append(PaperBlock(
                text=_clean_text(paragraph),
                page_start=page.page_number,
                page_end=page.page_number,
                section_type=current_section,
                section_title=current_title,
                is_reference=current_section == "references",
            ))

    abstract = next((b.text for b in blocks if b.section_type == "abstract"), None)
    return PaperDocument(
        title=title,
        authors=[],
        abstract=abstract,
        pages=pages,
        blocks=blocks,
        raw_markdown="\n\n".join(page.text for page in pages),
        parser="pypdf",
    )
