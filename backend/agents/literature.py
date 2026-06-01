from typing import List
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

    def run(self, text_chunks: List[str], progress_callback=None) -> str:
        partial_summaries = [None] * len(text_chunks)
        completed_count = 0

        if len(text_chunks) == 1:
            partial_summaries[0] = self._extract_chunk(text_chunks[0])
            if progress_callback:
                progress_callback(1, 1)
        else:
            with ThreadPoolExecutor(max_workers=min(len(text_chunks), 4)) as executor:
                futures = {
                    executor.submit(self._extract_chunk, chunk): idx
                    for idx, chunk in enumerate(text_chunks)
                }
                for future in as_completed(futures):
                    idx = futures[future]
                    partial_summaries[idx] = future.result()
                    completed_count += 1
                    if progress_callback:
                        progress_callback(completed_count, len(text_chunks))

        merged_prompt = f"""
The following are analysis results from different fragments of the same material.
Please deduplicate, integrate, and reorganize into a complete research reading card.

Fragment Analysis Results:
{chr(10).join(partial_summaries)}

Output strictly in this format:

Paper Title: [Extract the original title of this paper/document from the content. If no clear title is found, write "未知标题"]

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
