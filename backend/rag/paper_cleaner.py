from collections import Counter

from backend.rag.paper_types import PaperPage


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