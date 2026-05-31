import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from backend.agents.literature import LiteratureParserAgent
from backend.agents.relation import ProjectRelationAgent
from backend.agents.writing import WritingAgent
from backend.agents.todo import TodoAgent
from backend.core.file_reader import read_file, clean_text
from backend.core.chunker import chunk_text, estimate_tokens
from backend.core.config import ConfigManager
from backend.core.history import HistoryManager
from backend.core.llm_client import LLMCallError

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

config_manager = ConfigManager("data/config.json")
history_manager = HistoryManager("data/outputs")


def get_model_params():
    config = config_manager.load()
    model_config = config["model"]
    return model_config["model_name"], model_config["api_key"], model_config["base_url"]


@router.post("/single")
async def analyze_single(
    file: UploadFile = File(...),
    max_chars: int = Form(7000),
    overlap: int = Form(500),
):
    # Read file
    file_bytes = await file.read()
    raw_text = read_file(file.filename, file_bytes)
    document_text = clean_text(raw_text)

    if not document_text.strip():
        raise HTTPException(status_code=400, detail="No text extracted from file.")

    # Chunk text
    text_chunks = chunk_text(document_text, max_chars=max_chars, overlap=overlap)
    token_estimate = estimate_tokens(document_text)

    # Get model params
    model_name, api_key, base_url = get_model_params()
    config = config_manager.load()
    research_context = config["research"]["background"]
    writing_style = config["research"]["writing_style"]

    try:
        # Run agents
        lit_agent = LiteratureParserAgent(model_name, api_key, base_url)
        reading_card = lit_agent.run(text_chunks=text_chunks)

        rel_agent = ProjectRelationAgent(model_name, api_key, base_url)
        relation_analysis = rel_agent.run(
            reading_card=reading_card,
            user_research_context=research_context,
        )

        write_agent = WritingAgent(model_name, api_key, base_url)
        writing_materials = write_agent.run(
            reading_card=reading_card,
            relation_analysis=relation_analysis,
            writing_style=writing_style,
        )

        todo_agent = TodoAgent(model_name, api_key, base_url)
        todo_list = todo_agent.run(
            reading_card=reading_card,
            relation_analysis=relation_analysis,
        )

        # Build full report
        from datetime import datetime
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        full_report = f"""# Note Forge Analysis Report

- File: {file.filename}
- Model: {model_name}
- Time: {now}
- Text Length: {len(document_text)} chars
- Token Estimate: {token_estimate}

---

{reading_card}

---

{relation_analysis}

---

{writing_materials}

---

{todo_list}
"""

        # Save to history
        record_id = history_manager.save(
            file_name=file.filename,
            model=model_name,
            reading_card=reading_card,
            relation_analysis=relation_analysis,
            writing_materials=writing_materials,
            todo_list=todo_list,
            full_report=full_report,
        )

        return {
            "id": record_id,
            "file_name": file.filename,
            "reading_card": reading_card,
            "relation_analysis": relation_analysis,
            "writing_materials": writing_materials,
            "todo_list": todo_list,
            "full_report": full_report,
        }

    except LLMCallError as e:
        raise HTTPException(status_code=500, detail=str(e))
