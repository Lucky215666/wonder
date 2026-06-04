from typing import List, Dict, Optional, Literal
from .base import BaseAgent


class QAAgent(BaseAgent):
    SYSTEM_PROMPT = """
You are a research Q&A agent based on document context.
Requirements:
1. Prioritize answering based on uploaded materials and existing analysis.
2. If the answer is not in the materials, explicitly state "当前资料中未找到直接依据".
3. Do not fabricate paper results, experiment data, or citations.
4. Output in Chinese.
"""

    MODE_PROMPTS: Dict[str, str] = {
        "general": (
            "Answer as a general research assistant. "
            "Do not cite knowledge base sources."
        ),
        "rag_enhanced": (
            "Prioritize retrieved chunks. "
            "Qualify unsupported claims."
        ),
        "mentioned_docs": (
            "Only discuss the mentioned paper as evidence. "
            "If evidence is insufficient, say so briefly."
        ),
        "compare_docs": (
            "Use structured comparison: common points, differences, research implications. "
            "Each paper max 2 key cited points."
        ),
    }

    def run(
        self,
        document_context: str,
        analysis_report: str,
        question: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        user_name: str = "",
        answer_mode: Optional[str] = None,
        max_answer_tokens: int = 1800,
        max_context_chars: int = 10000,
    ) -> str:
        context = document_context[:max_context_chars]

        system_prompt = self.SYSTEM_PROMPT
        if answer_mode and answer_mode in self.MODE_PROMPTS:
            system_prompt += f"\nMode: {self.MODE_PROMPTS[answer_mode]}"
        if user_name:
            system_prompt += f"\nThe user's name is {user_name}. Address them by name when appropriate."

        history_text = ""
        if conversation_history:
            for msg in conversation_history[-6:]:  # Last 3 rounds
                role = msg.get("role", "")
                content = msg.get("content", "")
                history_text += f"\n{role}: {content}"

        user_prompt = f"""
Document excerpt:
{context}

Existing analysis report:
{analysis_report}

Conversation history:
{history_text}

User question:
{question}

Answer the user's question. When necessary, indicate which type of information from the materials your answer is based on.
"""
        return self.call_llm(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=max_answer_tokens,
        )
