import json
import re
from .base import BaseAgent


class ProjectRelationAgent(BaseAgent):
    SYSTEM_PROMPT = """
You are a research project relation analysis agent.
Your task is to determine the relationship between current material and user's research project.
Requirements:
1. Only analyze based on user's research background and material content.
2. Do not exaggerate relevance.
3. Output should be specific and actionable.
4. Do not output internal reasoning, only conclusions and evidence.
"""

    def run(self, reading_card: str, user_research_context: str) -> dict:
        user_prompt = f"""
User's current research/learning background:
{user_research_context}

Material reading card:
{reading_card}

Analyze the relation and output a JSON object with these fields:
- "fit_score": integer 0-100 representing how relevant this material is to the user's research.
  Scale: 0-20=basically irrelevant, 21-40=weakly relevant, 41-60=moderately relevant, 61-80=highly relevant, 81-100=directly usable.
- "fit_reason": one sentence explaining the score (in the same language as the user's background).
- "relation_type": one of "supplement", "duplicate", "conflict", "extension", "method_reference", "unrelated".
- "recommended_action": one of "add" (directly usable, score>=70), "deep_read" (highly relevant, score 50-69), "skim" (moderately relevant, score 30-49), "ignore" (basically irrelevant, score<30).
- "suggested_placement": an object with:
  - "sub_direction": a short label for which sub-direction in the user's research area this paper fits (e.g. "NLP-文本分类", "CV-目标检测"). Use the user's research context to infer the label.
  - "tags": an array of 3-5 short tags (keywords) relevant to this paper's content for categorization.
- "novelty_for_kb": a markdown string (2-4 sentences) explaining what NEW knowledge, methods, or perspectives this paper adds beyond what is likely already in the user's knowledge base. If nothing novel, say so briefly.
- "readme_suggestions": an array of 0-3 objects, each with:
  - "section": the README section name this suggestion applies to
  - "suggestion": what to add or update
  - "reason": why this update is valuable
  Only suggest updates that are directly supported by this paper's content.
- "analysis": the full relation analysis in markdown format, covering:
  1. Content for Literature Review
  2. Content for Method Design
  3. Content for Experiment Comparison
  4. Differences from Current Project
  5. Key Points for Citation/Recording

Output ONLY the JSON object, no other text. Use the same language as the user's research background for all text fields.
"""
        raw = self.call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=5000,
        )

        # Try to parse JSON from the response
        try:
            # Strip markdown code fences if present
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            return json.loads(cleaned)
        except (json.JSONDecodeError, ValueError):
            # Fallback: return raw text as analysis with neutral score
            return {
                "fit_score": 50,
                "fit_reason": "",
                "relation_type": "unrelated",
                "analysis": raw,
                "suggested_placement": {"sub_direction": "", "tags": []},
                "novelty_for_kb": "",
                "readme_suggestions": [],
            }
