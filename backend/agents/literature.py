import json
import re
from typing import Any, Dict, List
from concurrent.futures import ThreadPoolExecutor, as_completed
from .base import BaseAgent


class LiteratureParserAgent(BaseAgent):
    SYSTEM_PROMPT = """
You are a rigorous Chinese research material analysis agent.
Your task is to extract structured information from papers, technical documents, or experiment records.
Requirements:
1. Do not fabricate information not in the original text.
2. Mark uncertain content as "文中未明确说明".
3. Output in Chinese.
4. Do not output lengthy reasoning, only structured results.
"""

    def _extract_chunk(self, chunk: str) -> str:
        user_prompt = f"""
Please read the following material fragment and extract structured information.

Fragment:
{chunk}

Output format:

## Fragment Core Information
- Research Background:
- Core Problem:
- Method/System Design:
- Dataset/Experiment Objects:
- Metrics/Evaluation:
- Key Conclusions:
- Reusable Content:
- Uncertain/Missing Information:
"""
        return self.call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=2200,
        )

    @staticmethod
    def _strip_json_fence(raw: str) -> str:
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        return text.strip()

    @staticmethod
    def _normalize_signal(signal: Dict[str, Any], chunk_index: int) -> Dict[str, Any]:
        return {
            "text": str(signal.get("text", "")).strip(),
            "signal_type": str(signal.get("signal_type", signal.get("signalType", "unknown"))).strip() or "unknown",
            "section_type": str(signal.get("section_type", signal.get("sectionType", "unknown"))).strip() or "unknown",
            "chunk_index": chunk_index,
            "evidence_hint": str(signal.get("evidence_hint", signal.get("evidenceHint", ""))).strip(),
        }

    def _parse_focused_chunk_result(self, raw: str, chunk_index: int) -> Dict[str, Any]:
        try:
            parsed = json.loads(self._strip_json_fence(raw))
        except (json.JSONDecodeError, TypeError, ValueError):
            return {"chunk_index": chunk_index, "signals": [], "missing_or_uncertain": ["chunk extraction returned invalid JSON"]}

        raw_signals = parsed.get("signals", [])
        signals = []
        if isinstance(raw_signals, list):
            for item in raw_signals:
                if isinstance(item, dict):
                    normalized = self._normalize_signal(item, chunk_index)
                    if normalized["text"]:
                        signals.append(normalized)

        missing = parsed.get("missing_or_uncertain", parsed.get("missingOrUncertain", []))
        if not isinstance(missing, list):
            missing = [str(missing)]

        return {
            "chunk_index": chunk_index,
            "signals": signals,
            "missing_or_uncertain": [str(item).strip() for item in missing if str(item).strip()],
        }

    def _extract_focused_chunk(self, chunk: str, chunk_index: int, research_context: str) -> Dict[str, Any]:
        user_prompt = f"""
Read this material fragment in light of the user's research context.

User research context:
{research_context or "No explicit research context provided."}

Fragment index: {chunk_index}
Fragment:
{chunk}

Return ONLY a JSON object:
{{
  "signals": [
    {{
      "text": "concise Chinese statement",
      "signal_type": "key_claim|method|result|novelty|overlap|conflict_or_risk|reuse",
      "section_type": "abstract|introduction|method|experiment|result|discussion|conclusion|reference|unknown",
      "evidence_hint": "short source phrase"
    }}
  ],
  "missing_or_uncertain": ["concise Chinese uncertainty note"]
}}

Rules:
- Prefer method, experiment, result, discussion, and conclusion signals over generic background.
- Do not treat bibliography/reference-list content as evidence for paper claims.
- Do not fabricate datasets, metrics, results, or limitations.
- If a section is unclear, use "unknown".
"""
        raw = self.call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.15,
            max_tokens=1800,
        )
        return self._parse_focused_chunk_result(raw, chunk_index)

    def _merge_reading_card(self, partial_summaries: List[str]) -> str:
        merged_prompt = f"""
The following are analysis results from different fragments of the same material.
Please deduplicate, integrate, and reorganize into a complete research reading card.

Fragment Analysis Results:
{chr(10).join(partial_summaries)}

Output strictly in this format. The FIRST LINE must be the paper title:

Paper Title: [Extract the exact original title of this paper/document from the content]
WRONG: **Paper Title:** xxx   (do NOT add markdown bold)
WRONG: paper title: xxx       (do NOT use lowercase)
WRONG: 论文标题：xxx           (do NOT use Chinese label)
RIGHT: Paper Title: Attention Is All You Need
RIGHT: Paper Title: 未知标题  (only if no title found in the text)

# Research Material Reading Card

## 1. Topic Summary
Summarize what this material researches or discusses in 3-5 sentences.

## 2. Core Pain Points
Explain the key problems this material tries to solve.

## 3. Method/System Workflow
Describe the technical route, model structure, algorithm logic, or system design in order.

## 4. Datasets, Experiment Settings & Metrics
Organize data sources, experiment settings, evaluation metrics, and comparison objects.

## 5. Main Conclusions
List 3-6 conclusions.

## 6. Innovations or Reference Points
Explain what reusable value this material has for research, course projects, paper writing, or code implementation.

## 7. Limitations & Potential Issues
Point out possible shortcomings in methods, experiments, or arguments.

## 8. One-line Summary
Summarize the value of this material in one sentence.
"""
        return self.call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=merged_prompt,
            temperature=0.2,
            max_tokens=3500,
        )

    def run(self, text_chunks: List[str], research_context: str = "", progress_callback=None) -> Dict[str, Any]:
        focused_results: List[Dict[str, Any]] = [None] * len(text_chunks)  # type: ignore[list-item]
        partial_summaries = [None] * len(text_chunks)
        completed_count = 0

        def extract(idx: int, chunk: str):
            return idx, self._extract_focused_chunk(chunk, idx, research_context), self._extract_chunk(chunk)

        if len(text_chunks) == 1:
            idx, focused, summary = extract(0, text_chunks[0])
            focused_results[idx] = focused
            partial_summaries[idx] = summary
            if progress_callback:
                progress_callback(1, 1)
        else:
            with ThreadPoolExecutor(max_workers=min(len(text_chunks), 4)) as executor:
                futures = {
                    executor.submit(extract, idx, chunk): idx
                    for idx, chunk in enumerate(text_chunks)
                }
                for future in as_completed(futures):
                    idx, focused, summary = future.result()
                    focused_results[idx] = focused
                    partial_summaries[idx] = summary
                    completed_count += 1
                    if progress_callback:
                        progress_callback(completed_count, len(text_chunks))

        focused_signals = [
            signal
            for item in focused_results
            if item
            for signal in item.get("signals", [])
        ]

        merged_card = self._merge_reading_card(partial_summaries)
        return {
            "reading_card": merged_card,
            "focused_signals": focused_signals,
        }
