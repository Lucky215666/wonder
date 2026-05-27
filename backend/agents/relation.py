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

    def run(self, reading_card: str, user_research_context: str) -> str:
        user_prompt = f"""
User's current research/learning background:
{user_research_context}

Material reading card:
{reading_card}

Generate project relation analysis in this format:

# Project Relation Analysis

## 1. Relevance Score
Rate 0-5 and explain why.
- 0: Basically irrelevant
- 1: Weakly relevant
- 2: Some reference value
- 3: Moderately relevant
- 4: Highly relevant
- 5: Directly usable in current project

## 2. Content for Literature Review
What content is suitable for research background or related work.

## 3. Content for Method Design
What ideas, modules, workflows, metrics, or experiment settings can be transferred.

## 4. Content for Experiment Comparison
Whether it can serve as baseline, comparison method, metric reference, or ablation study reference.

## 5. Differences from Current Project
Explain differences between this material and user's project to avoid forced application.

## 6. Key Points for Citation/Recording
List bullet points reusable for paper writing, proposal, or defense.
"""
        return self.call_llm(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=3500,
        )
