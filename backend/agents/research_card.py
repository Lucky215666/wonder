"""Research card draft agent: extracts structured card data from a QA exchange."""
import json
import re
from typing import List, Optional

from .base import BaseAgent


class ResearchCardDraftAgent(BaseAgent):
    """Given a QA question, answer, and source references, produce a structured
    research card draft (core claims, knowledge type, tags, etc.)."""

    SYSTEM_PROMPT = """You are a research card drafting assistant.
Given a question, its answer, and optional source references from a knowledge base,
extract structured information for a research card.

Rules:
1. core_claims: 1-5 concise, self-contained knowledge statements distilled from the answer.
   Each claim must be factual and verifiable.
2. knowledge_type: classify as one of: method, theory, finding, research_question, gap,
   limitation, writing_material, other.
3. tags: 0-5 short lowercase keyword tags relevant to the content.
4. sub_direction: a brief label for the research sub-area (empty string if unclear).
5. validation_notes: one sentence noting confidence or caveats about the claims.
6. use_cases: 0-3 brief descriptions of how this knowledge could be applied.
7. linked_doc_ids: document IDs referenced in source_refs that are directly relevant.
8. no_paper_evidence: true only if there are zero source_refs with content.
9. evidence_refs: pass through the source_refs that directly support the core claims
   (subset of input source_refs, keeping original fields).

Output ONLY a JSON object, no markdown fences, no extra text."""

    def run(
        self,
        question: str,
        answer: str,
        answer_mode: Optional[str] = None,
        source_refs: Optional[List[dict]] = None,
    ) -> dict:
        """Draft a research card from a QA exchange.

        Returns a dict matching ResearchCardDraftResponse fields.
        """
        refs = source_refs or []
        refs_json = json.dumps(refs, ensure_ascii=False, indent=2)

        mode_line = f"\nAnswer mode: {answer_mode}" if answer_mode else ""

        user_prompt = f"""Question:
{question}

Answer:
{answer}{mode_line}

Source references ({len(refs)} items):
{refs_json}

Extract the research card fields as a JSON object with keys:
question, core_claims, knowledge_type, tags, sub_direction,
validation_notes, use_cases, linked_doc_ids, no_paper_evidence, evidence_refs"""

        raw = self.call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.1,
            max_tokens=2500,
        )

        return self._parse_response(raw, question, refs)

    @staticmethod
    def _parse_response(raw: str, question: str, source_refs: List[dict]) -> dict:
        """Parse LLM output into a validated dict, with safe fallbacks."""
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        try:
            data = json.loads(cleaned)
        except (json.JSONDecodeError, ValueError):
            # Fallback: minimal card from raw text
            return {
                "question": question,
                "core_claims": [cleaned[:500]] if cleaned else ["(empty)"],
                "knowledge_type": "other",
                "tags": [],
                "sub_direction": "",
                "validation_notes": "Auto-generated fallback; LLM output was not valid JSON.",
                "use_cases": [],
                "linked_doc_ids": [],
                "no_paper_evidence": len(source_refs) == 0,
                "evidence_refs": [],
            }

        # Validate and fill defaults for missing keys
        valid_types = {
            "method", "theory", "finding", "research_question",
            "gap", "limitation", "writing_material", "other",
        }
        knowledge_type = data.get("knowledge_type", "other")
        if knowledge_type not in valid_types:
            knowledge_type = "other"

        # Ensure evidence_refs only contains refs that were in the input
        input_ref_keys = set()
        for ref in source_refs:
            key = (ref.get("doc_id"), ref.get("chunk_id"), ref.get("content", "")[:100])
            input_ref_keys.add(key)

        evidence_refs = data.get("evidence_refs", [])
        if not isinstance(evidence_refs, list):
            evidence_refs = []
        # Pass through evidence refs as-is (they come from LLM selection of input refs)

        linked_doc_ids = data.get("linked_doc_ids", [])
        if not isinstance(linked_doc_ids, list):
            linked_doc_ids = []

        no_paper = data.get("no_paper_evidence", len(source_refs) == 0)
        if not isinstance(no_paper, bool):
            no_paper = bool(no_paper)

        return {
            "question": data.get("question", question),
            "core_claims": [
                str(c) for c in data.get("core_claims", [])
                if c
            ] or ["(no claims extracted)"],
            "knowledge_type": knowledge_type,
            "tags": [str(t).strip().lower() for t in data.get("tags", []) if t][:5],
            "sub_direction": str(data.get("sub_direction", "") or ""),
            "validation_notes": str(data.get("validation_notes", "") or ""),
            "use_cases": [str(u) for u in data.get("use_cases", []) if u][:3],
            "linked_doc_ids": linked_doc_ids,
            "no_paper_evidence": no_paper,
            "evidence_refs": evidence_refs,
        }
