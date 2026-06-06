from __future__ import annotations

import re
from collections import Counter
from dataclasses import replace

from backend.rag.paper_types import PaperBlock, PaperDocument, PaperPage

SECTION_RULES = [
    ("abstract", re.compile(r"^\s*(abstract|摘要)\s*$", re.I)),
    ("introduction", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(introduction|引言|绪论)\b", re.I)),
    ("related_work", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(related work|prior work玺)\b", re.I)),
    ("background", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(background|preliminaries|背景)\b", re.I)),
    ("method", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(method|approach|model|proposed|algorithm|refinement|framework|方法|模型)\b", re.I)),
    ("experiment", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(experiment|experimental|evaluation|dataset|实验|评估)\b", re.I)),
    ("result", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(result|results|analysis玺)\b", re.I)),
    ("discussion", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(discussion|讨论)\b", re.I)),
    ("conclusion", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(conclusion|conclusions|结论)\b", re.I)),
    ("limitation", re.compile(r"^\s*(\d+(\.\d+)?\s+)?.*?(limitation|limitations|局限)\b", re.I)),
    ("reference", re.compile(r"^\s*(references|bibliography|参考文献)\s*$", re.I)),
    ("appendix", re.compile(r"^\s*(appendix|附录)\b", re.I)),
]


def normalize_text(text: str) -> str:
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def detect_section_type(heading: str) -> str:
    for section_type, pattern in SECTION_RULES:
        if pattern.search(heading.strip()):
            return section_type
    return "unknown"


def clean_and_label_paper(doc: PaperDocument) -> PaperDocument:
    current_title = ""
    current_type = "unknown"
    in_references = False
    cleaned_blocks: list[PaperBlock] = []

    for block in sorted(doc.blocks, key=lambda b: b.order):
        text = normalize_text(block.text)
        if not text:
            continue

        kind = block.block_type
        if kind == "heading":
            detected = detect_section_type(text)
            current_title = text
            current_type = detected
            in_references = detected in {"reference", "appendix"}
            cleaned_blocks.append(replace(
                block,
                text=text,
                section_title=current_title,
                section_type=current_type,
                is_reference=in_references,
            ))
            continue

        block_is_reference = in_references or block.is_reference or kind == "reference"
        cleaned_blocks.append(replace(
            block,
            text=text,
            section_title=current_title,
            section_type="reference" if block_is_reference else current_type,
            is_reference=block_is_reference,
        ))

    return replace(doc, blocks=cleaned_blocks)


def remove_repeated_headers(pages: list[PaperPage]) -> list[PaperPage]:
    first_lines = []
    for page in pages:
        lines = [line.strip() for line in page.text.splitlines() if line.strip()]
        if lines:
            first_lines.append(lines[0])
    repeated = {
        line for line, count in Counter(first_lines).items()
        if count >= 3 and len(line) <= 120
    }
    cleaned = []
    for page in pages:
        lines = page.text.splitlines()
        if lines and lines[0].strip() in repeated:
            lines = lines[1:]
        cleaned.append(PaperPage(page.page_number, "\n".join(lines).strip()))
    return cleaned
