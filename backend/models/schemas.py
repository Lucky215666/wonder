from typing import Any, List, Literal, Optional
from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    max_chars: int = 7000
    overlap: int = 500


class AnalysisResponse(BaseModel):
    id: str
    file_name: str
    reading_card: str
    relation_analysis: str
    writing_materials: str
    todo_list: str
    full_report: str
    created_at: str


class HistoryItem(BaseModel):
    id: str
    file_name: str
    created_at: str
    model: str
    summary: str
    tags: List[str] = []


class HistoryListResponse(BaseModel):
    items: List[HistoryItem]
    total: int


class QARequest(BaseModel):
    question: str
    document_id: Optional[str] = None
    conversation_id: Optional[str] = None


class QAResponse(BaseModel):
    answer: str
    conversation_id: str
    sources: List[str] = []


class ConfigModel(BaseModel):
    model: dict
    embedding: dict
    research: dict
    watch: dict
    analysis: dict
    knowledge: dict


# 知识库相关模型
class EmbeddingConfig(BaseModel):
    model_config = {"protected_namespaces": ()}
    provider: str = "Anthropic"
    api_key: str = ""
    base_url: str = "https://api.anthropic.com"
    model_name: str = "text-embedding-3-small"
    dimensions: int = 1536

class KnowledgeConfig(BaseModel):
    enabled: bool = True
    chroma_path: str = "data/chroma"
    sqlite_path: str = "data/knowledge.db"
    auto_index: bool = True
    max_context_tokens: int = 8000

class KnowledgeQARequest(BaseModel):
    question: str
    knowledge_base_id: Optional[str] = None
    knowledge_base_readme: str = ""
    global_profile: str = ""
    doc_ids: Optional[List[str]] = None
    top_k_docs: int = 3
    top_k_chunks: int = 5

class KnowledgeQAResponse(BaseModel):
    answer: str
    source_doc_ids: List[str]
    source_chunks: List[str]

class SearchRequest(BaseModel):
    query: str
    doc_ids: Optional[List[str]] = None
    top_k: int = 10

class SearchResponse(BaseModel):
    results: List[dict]

class DocumentListResponse(BaseModel):
    documents: List[dict]
    total: int

class DocumentDetailResponse(BaseModel):
    id: str
    file_name: str
    created_at: str
    summary: str
    reading_card: str
    relation_analysis: str
    writing_materials: str
    todo_list: str
    chunk_count: int
    total_tokens: int


class GatewayAnalysisRequest(BaseModel):
    doc_id: str
    file_name: str
    file_type: str = ""
    text: str
    knowledge_base_id: Optional[str] = None
    knowledge_base_readme: str = ""
    global_profile: str = ""
    max_chars: int = 7000
    overlap: int = 500


class GatewayAnalysisResponse(BaseModel):
    doc_id: str
    file_name: str
    status: Literal["ok", "partial"]
    failed_agents: List[str] = []
    reading_card: str
    relation_analysis: str
    writing_materials: str
    todo_list: str
    summary: str
    tags: List[str] = []
    fit_score: Optional[float] = None
    placement: Optional[str] = None
    recommended_action: Optional[str] = None
    readme_suggestions: List[dict] = []
    source_chunks: List[str] = []


class KnowledgeIndexRequest(BaseModel):
    doc_id: str
    knowledge_base_id: str
    file_name: str
    file_path: str = ""
    chunks: List[str]
    summary: str
    analysis_result: dict
    tags: List[str] = []
