# Wonder — Multi-Agent 与 RAG 系统架构详解

> 本文档基于源码梳理，覆盖 `backend/agents/`、`backend/rag/`、`backend/core/providers/` 三个模块。

---

## 目录

- [一、Multi-Agent 系统](#一multi-agent-系统)
  - [1.1 整体架构](#11-整体架构)
  - [1.2 BaseAgent 基类](#12-baseagent-基类)
  - [1.3 Orchestrator 调度器](#13-orchestrator-调度器)
  - [1.4 文档分析 Pipeline](#14-文档分析-pipeline)
  - [1.5 各 Agent 实现细节](#15-各-agent-实现细节)
  - [1.6 Agent 串联数据流](#16-agent-串联数据流)
- [二、RAG 系统](#二rag-系统)
  - [2.1 整体架构](#21-整体架构)
  - [2.2 文本分块](#22-文本分块)
  - [2.3 向量索引](#23-向量索引)
  - [2.4 两层向量检索](#24-两层向量检索)
  - [2.5 向量存储](#25-向量存储)
  - [2.6 Embedding 系统](#26-embedding-系统)
  - [2.7 RAG + Agent 完整问答流程](#27-rag--agent-完整问答流程)
- [三、Provider 适配层](#三provider-适配层)
- [四、总结](#四总结)

---

## 一、Multi-Agent 系统

### 1.1 整体架构

```
用户请求 → FastAPI → Orchestrator(调度器) → 各 Agent → LLM Provider → 外部 API
```

项目采用**中心化调度模式**：Orchestrator 是唯一入口，每个 Agent 只跟 Orchestrator 交互，不感知其他 Agent 的存在。

系统共有 6 个专业 Agent：

| Agent | 文件 | 职责 |
|-------|------|------|
| `LiteratureParserAgent` | `agents/literature.py` | 文献解析，chunk 并行提取 + 合并去重 |
| `ProjectRelationAgent` | `agents/relation.py` | 项目关联分析，输出结构化 JSON |
| `WritingAgent` | `agents/writing.py` | 写作辅助，生成写作素材 + 结构化资产 |
| `TodoAgent` | `agents/todo.py` | 任务规划，按优先级生成待办清单 |
| `QAAgent` | `agents/qa.py` | 基于 RAG 上下文的问答 |
| `ReadmeAdvisorAgent` | `agents/readme_advisor.py` | 知识库 README 更新建议 |

---

### 1.2 BaseAgent 基类

> 文件：`backend/agents/base.py`

```python
class BaseAgent(ABC):
    def __init__(self, model, api_key="", base_url="", provider=None):
        self._provider = provider  # 注入的 Provider 适配器

    def call_llm(self, system_prompt, user_prompt, temperature=0.2, max_tokens=3000) -> str:
        provider = self._get_provider()  # 懒加载，首次调用时创建
        return provider.chat(...)        # 通过 Protocol 接口调用

    @abstractmethod
    def run(self, **kwargs) -> str:
        pass
```

设计要点：

- **依赖反转** — 每个 Agent 通过 `provider` 参数注入 LLM 调用能力，不直接依赖具体 SDK
- **懒加载** — `_get_provider()` 在首次调用时才创建 provider 实例
- **共享实例** — 所有 Agent 共享同一个 provider（由 Orchestrator 统一创建后注入）

---

### 1.3 Orchestrator 调度器

> 文件：`backend/agents/orchestrator.py`

Orchestrator 是 Multi-Agent 系统的核心，支持两种运行模式：

#### 同步模式 `route_task()`

根据 `task_type` 分发：

| task_type | 流程 |
|---|---|
| `analyze_document` | 文献解析 → 项目关联 → (写作 + 待办并行) |
| `ask_question` | RAG 检索 → 问答 |
| `generate_writing` | 直接调 WritingAgent |
| `generate_todo` | 直接调 TodoAgent |

#### 流式模式 `run_streaming()`

用 Python generator 逐事件 yield，配合 SSE 推送到前端。事件类型：

```
literature running → literature done →
relation running → relation done →
writing running + todo running → writing done + todo done →
relation_meta → writing_meta
```

---

### 1.4 文档分析 Pipeline

这是最核心的 Agent 串联流程，`_analyze_document()` 的执行顺序：

```
Step 1: LiteratureParserAgent (文献解析)
   输入: text_chunks (分块后的文本)
   输出: reading_card (结构化阅读卡片)
   特点: chunk 并行提取 → 合并去重（ThreadPoolExecutor, max_workers=4）

Step 2: ProjectRelationAgent (项目关联)
   输入: reading_card + user_research_context (用户研究背景)
   输出: {fit_score, relation_type, recommended_action, analysis, ...}  (JSON)

Step 3+4: WritingAgent + TodoAgent (并行执行)
   输入: 都依赖 reading_card + relation_analysis
   输出: writing_materials + todo_list
   并行方式: ThreadPoolExecutor(max_workers=2)
```

**并行策略**：
- Step 1 内部并行 — chunk 多时用 `ThreadPoolExecutor` 并发提取每个 chunk，`as_completed` 收集结果
- Step 3 和 Step 4 之间没有数据依赖，所以并行执行

---

### 1.5 各 Agent 实现细节

#### LiteratureParserAgent

> 文件：`backend/agents/literature.py`

两阶段处理：

1. **阶段一：chunk 并行提取**
   - `_extract_chunk(chunk)` — 对单个 chunk 提取结构化信息（背景/问题/方法/结论等）
   - `ThreadPoolExecutor(max_workers=4)` + `as_completed` 并发执行
   - 进度通过 `progress_callback(current, total)` 回调

2. **阶段二：合并去重**
   - 将所有 chunk 的提取结果拼接
   - 再调一次 LLM，要求"去重、整合、重组为完整阅读卡片"
   - 输出格式：`Paper Title: xxx` 开头 + 8 个固定 section

#### ProjectRelationAgent

> 文件：`backend/agents/relation.py`

- 单次 LLM 调用，prompt 要求输出 JSON
- JSON 结构：

```json
{
  "fit_score": 75,              // 0-100 相关度评分
  "fit_reason": "...",          // 评分理由
  "relation_type": "supplement", // supplement/duplicate/conflict/extension/method_reference/unrelated
  "recommended_action": "add",  // add(≥70)/deep_read(50-69)/skim(30-49)/ignore(<30)
  "suggested_placement": {
    "sub_direction": "NLP-文本分类",
    "tags": ["tag1", "tag2"]
  },
  "novelty_for_kb": "...",      // 新增知识/方法/视角
  "readme_suggestions": [],     // README 更新建议
  "analysis": "..."             // 完整分析 markdown
}
```

- 容错：JSON 解析失败时返回默认中性值 `{fit_score: 50, relation_type: "unrelated"}`

#### WritingAgent

> 文件：`backend/agents/writing.py`

输出 JSON 包含两个顶层 key：

- `writing_assets` — 结构化可引用素材：
  - `usable_claims` — 可直接引用的论断
  - `method_references` — 方法描述
  - `theory_references` — 理论框架
  - `possible_literature_review_use` — 文献综述用法
  - `limitations_or_critique` — 局限性/批评

- `writing_materials` — 完整 markdown 写作材料（文献综述段落、方法灵感、实验设计参考等）

#### TodoAgent

> 文件：`backend/agents/todo.py`

最简单的 Agent，纯 markdown 表格输出，按优先级分三档（高/中/低），每项包含：
- 任务、目的、预计时间、输出物
- 推荐执行顺序（5 步以内）
- 风险提醒

#### QAAgent

> 文件：`backend/agents/qa.py`

- 多轮对话支持（取最近 6 条消息，即 3 轮）
- 个性化（称呼用户名字）
- 严格约束："如果资料中没有，明确说未找到"
- 上下文截断：`max_context_chars = 10000`

#### ReadmeAdvisorAgent

> 文件：`backend/agents/readme_advisor.py`

- 独立于主分析流程，文档添加到知识库后触发
- 分析新文档，建议更新知识库 README 的 0-3 个 section
- 输出 JSON 数组，每个元素包含 `section`、`suggestion`、`reason`

---

### 1.6 Agent 串联数据流

```
原始文本
  ↓ chunk_text()
text_chunks: List[str]
  ↓ LiteratureParserAgent (chunk并行 → 合并)
reading_card: str
  ↓ _extract_paper_title()
paper_title + reading_card
  ↓ ProjectRelationAgent
relation: dict {fit_score, analysis, ...}
  ↓ (reading_card + relation_text) 并行分发
  ├→ WritingAgent → {writing_assets, writing_materials}
  └→ TodoAgent → todo_list
  ↓
最终结果 dict（合并所有 Agent 输出）
```

每个 Agent 的输出成为下一个 Agent 的输入 — **串行 pipeline + 并行 fan-out** 模式。

---

## 二、RAG 系统

### 2.1 整体架构

```
文档上传 → chunk_text() → DocumentIndexer → EmbeddingClient → ChromaDB
                                                                ↓
用户提问 → RAGRetriever → EmbeddingClient → ChromaDB 向量检索 → 组装上下文 → QAAgent
```

涉及文件：

| 文件 | 职责 |
|------|------|
| `core/chunker.py` | 文本分块（滑动窗口） |
| `core/embedding.py` | Embedding 客户端（多 provider） |
| `core/storage.py` | ChromaDB 存储封装 |
| `rag/indexer.py` | 文档索引（summary + chunk 双层） |
| `rag/retriever.py` | 向量检索（两层检索 + 上下文组装） |

---

### 2.2 文本分块

> 文件：`backend/core/chunker.py`

```python
def chunk_text(text, max_chars=7000, overlap=500) -> List[str]:
```

- 滑动窗口分块，`overlap=500` 字符保证上下文连续性
- 如果文本 ≤ 7000 字符，不分块直接返回
- 简单直接，没有按语义/段落分

---

### 2.3 向量索引

> 文件：`backend/rag/indexer.py`

`DocumentIndexer.index_document()` 流程：

```python
texts_to_embed = [summary] + chunks          # 摘要 + 所有 chunk
embeddings = self.embedding.embed(texts_to_embed)  # 批量 embedding

# 每个文档生成:
# - 1 个 summary 向量 (chunk_type="summary")
# - N 个 content 向量 (chunk_type="content")

# 元数据:
{
    "doc_id": "...",
    "knowledge_base_id": "...",
    "file_name": "...",
    "chunk_type": "summary" | "content",
    "chunk_index": 0,
    "tags": "...",
    "created_at": "..."
}
```

设计要点：

- **双层索引** — summary 和 content 分开存储，检索时先找 summary 定位文档，再在文档内找 content chunk
- **knowledge_base_id 隔离** — 每个知识库的向量完全隔离
- **ID 命名规则** — `{doc_id}_{kb_id}_summary` 和 `{doc_id}_{kb_id}_chunk_{i}`

---

### 2.4 两层向量检索

> 文件：`backend/rag/retriever.py`

`RAGRetriever.retrieve()` 实现了两层检索：

```
Step 1: 摘要层检索
  query_embedding → ChromaDB query
  filter: chunk_type="summary" + knowledge_base_id + doc_ids
  返回: top_k_docs=3 篇最相关文档的摘要

Step 2: 内容层检索
  从 Step 1 拿到 matched_doc_ids
  query_embedding → ChromaDB query
  filter: chunk_type="content" + doc_id IN matched_doc_ids
  返回: top_k_chunks=5 个最相关的 chunk

Step 3: 组装上下文（控制 max_context_tokens=8000）
  [文档摘要] file1: ...
  [文档摘要] file2: ...
  [相关内容] file1: chunk3
  [相关内容] file1: chunk1
  [相关内容] file2: chunk2
```

**两层检索的好处**：
- 先通过摘要找到相关文档，再在文档内细粒度检索，避免不相关文档的 chunk 干扰
- 摘要提供全局理解，chunk 提供细节，上下文质量高

另外 `RAGRetriever` 还提供 `search()` 简单搜索接口，不做两层，直接返回相关分块 + 相似度分数。

---

### 2.5 向量存储

> 文件：`backend/core/storage.py`

```python
self.collection = self.chroma_client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"}  # 余弦相似度
)
```

- ChromaDB `PersistentClient`，数据持久化到 `data/chroma/`
- cosine 距离适合文本语义相似度
- `delete_from_collection` 支持按 `doc_id` 或 `doc_id + knowledge_base_id` 精确删除
- `query_collection` 支持 `where` 过滤（`$and`、`$in` 操作符）

---

### 2.6 Embedding 系统

> 文件：`backend/core/embedding.py`

`EmbeddingClient` 本身很薄，核心是 Provider 适配层：

| Provider | 模型 | 维度 | 场景 |
|---|---|---|---|
| OpenAI | text-embedding-3-small / 3-large | 1536 / 3072 | 默认 |
| MiniMax | text-embedding-003 | 1536 | 国内 |
| SiliconFlow | bge-large-zh-v1.5, bge-m3 | 1024 | 国内中文优化 |
| local | bge-small/large-zh-v1.5 | 512 / 1024 | 离线，sentence-transformers |

```python
class EmbeddingClient:
    def embed(self, texts: List[str]) -> List[List[float]]:
        return self._provider.embed(texts, model=self.model_name, dimensions=self.dimensions)

    @classmethod
    def from_config(cls, config: dict) -> "EmbeddingClient":
        provider = create_embedding_provider(config)
        return cls(provider=provider, model_name=..., dimensions=...)
```

本地 provider 特点（`local_embedding.py`）：
- 懒加载 + 线程锁缓存模型，避免重复加载
- `SentenceTransformer.encode(normalize_embeddings=True)` 归一化

---

### 2.7 RAG + Agent 完整问答流程

```
用户提问 "这篇论文的方法和我的项目有什么关系？"
  ↓
Orchestrator._ask_question()
  ↓
RAGRetriever.retrieve(query, kb_id, doc_ids)
  ↓ 检索结果
retrieval.context = "[文档摘要] xxx\n[相关内容] xxx"
  ↓ 拼接全局上下文
document_context = global_profile + kb_readme + retrieval.context
  ↓
QAAgent.run(document_context, question, conversation_history)
  ↓
返回 {answer, source_doc_ids, source_chunks}
```

上下文拼接优先级：
1. `[Global Profile]` — 用户全局研究背景
2. `[Knowledge Base README]` — 知识库说明
3. RAG 检索结果（摘要 + chunk）

---

## 三、Provider 适配层

> 文件：`backend/core/providers/`

采用 Protocol-based 适配器模式，不需要继承，只要实现同名方法（Python 鸭子类型）：

```python
# base.py — 定义接口
@runtime_checkable
class ChatProvider(Protocol):
    def chat(messages, *, model, temperature, max_tokens, system) -> str: ...
    def stream_chat(messages, *, model, temperature, max_tokens, system) -> Iterable[str]: ...
    def health_check() -> bool: ...

@runtime_checkable
class EmbeddingProvider(Protocol):
    def embed(texts, *, model, dimensions) -> list[list[float]]: ...
    def health_check() -> bool: ...
```

工厂函数（`factory.py`）：

```python
_PROVIDER_MAP = {
    "anthropic": AnthropicProvider,           # Anthropic SDK
    "openai_compatible": OpenAICompatibleProvider,  # OpenAI SDK
    "OpenAI": OpenAICompatibleProvider,       # 别名
    "local": LocalEmbeddingProvider,          # sentence-transformers
}
```

三个具体实现：

| Provider | 文件 | 关键实现 |
|---|---|---|
| `AnthropicProvider` | `anthropic.py` | `Anthropic.messages.create()`，支持 chat / stream_chat |
| `OpenAICompatibleProvider` | `openai_compatible.py` | `OpenAI.chat.completions.create()`，同时支持 chat + embed |
| `LocalEmbeddingProvider` | `local_embedding.py` | `SentenceTransformer.encode()`，懒加载 + 线程安全缓存 |

`_normalize_config()` 统一处理新旧配置格式（`api_key` / `apiKey`、`base_url` / `baseUrl` 等）。

---

## 四、总结

### Multi-Agent

- 6 个专业 Agent 通过 Orchestrator 中心调度
- 核心 pipeline：`文献解析 → 关联分析 → (写作 + 待办并行)`
- 串行传递上下文 + 并行 fan-out
- 每个 Agent 只做一件事，通过 prompt engineering 定义行为
- 流式输出通过 Python generator + SSE 实现

### RAG

- 双层检索架构：摘要层定位文档 → 内容层检索 chunk
- ChromaDB 存储 + cosine 距离
- 支持多知识库隔离（knowledge_base_id）
- Embedding 支持 4 种 provider 无缝切换
- 上下文组装控制 token 上限

### 交汇点

两个系统的交汇点是 **QAAgent** — RAG 检索提供上下文，Agent 负责理解用户问题并基于上下文生成回答。`Orchestrator._ask_question()` 将两者串联：先检索 → 再组装上下文 → 最后交给 Agent 生成答案。
