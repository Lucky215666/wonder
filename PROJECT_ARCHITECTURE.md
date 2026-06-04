# Wonder 项目架构文档

> 文答 Wonder (Research Desk) — AI 驱动的学术文献分析桌面应用
> 版本: 0.2.0 | 作者: Bruce Zhao

---

## 一、项目定位

面向科研人员的桌面工具，上传论文/技术文档后，通过多 Agent 协作自动生成阅读卡片、跨文献分析、写作素材、待办清单。同时提供 RAG 知识库、文献发现、引用网络可视化等功能。

---

## 二、三层架构

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Electron Shell (electron/)                │
│  React 19 + TypeScript + Vite + Zustand + Ant Design│
│  仅调用 Node/Hono API，不直接访问 Python             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────┐
│  Layer 2: Node/Hono Gateway (server/)               │
│  Hono 4 + better-sqlite3 (WAL, 14 张表)             │
│  请求校验、配置加载、SQLite 持久化、转发至 Python      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────┐
│  Layer 3: Python AI Core (backend/)                 │
│  FastAPI + Anthropic/OpenAI SDK + ChromaDB          │
│  唯一执行 LLM 调用和 Embedding 的层                   │
└─────────────────────────────────────────────────────┘
```

**边界规则：**
- 前端只调 Node/Hono，不直接访问 Python
- Node/Hono 负责持久化、校验、配置；不执行 LLM
- Python AI Core 是唯一执行 LLM 调用和 Embedding 的层

---

## 三、技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Electron 41 |
| 前端 | React 19, TypeScript 6, Vite 8, Zustand 5, Ant Design 6, react-router-dom 7 |
| 网关 | Hono 4, better-sqlite3 (SQLite, WAL mode) |
| AI 核心 | FastAPI + uvicorn, anthropic SDK, openai SDK, ChromaDB (cosine) |
| 文件解析 | pdf-parse, mammoth (Node); pypdf, python-docx (Python) |
| 构建 | Vite, electron-builder, electron-rebuild |
| 测试 | Vitest (Node), pytest (Python) |

**支持的 AI Provider：**
- Chat: Anthropic (Claude), OpenAI 兼容 (MiniMax, SiliconFlow, 自定义端点)
- Embedding: OpenAI (text-embedding-3-small/large), MiniMax, SiliconFlow (BGE 系列), 本地 (BGE-small-zh)

---

## 四、目录结构

```
wonder/
├── electron/                  # Layer 1: Electron 主进程
│   ├── main.ts                # 入口：动态端口、asar 解压、内嵌 Node 服务、窗口管理
│   └── preload.ts             # Context Bridge (IPC 通信)
│
├── src/                       # Layer 1: React 前端
│   ├── main.tsx               # 前端入口
│   ├── App.tsx                # 路由 & Shell 布局
│   ├── pages/                 # 页面组件
│   │   ├── Analysis.tsx       # 单文献分析
│   │   ├── Batch.tsx          # 批量矩阵
│   │   ├── Discovery.tsx      # 文献发现
│   │   ├── CitationNetwork.tsx# 引用网络
│   │   ├── QA.tsx             # 追问 Q&A
│   │   ├── Knowledge.tsx      # 知识库管理
│   │   ├── History.tsx        # 分析历史
│   │   └── HistoryDetail.tsx  # 历史详情
│   ├── components/            # 通用组件
│   │   ├── FileUpload.tsx     # 文件上传
│   │   ├── AnalysisResult.tsx # 分析结果展示
│   │   └── SettingsModal.tsx  # 设置弹窗
│   ├── stores/                # Zustand 状态管理
│   │   ├── analysis.ts        # 分析状态 (SSE 流式)
│   │   ├── batch.ts           # 批量分析状态
│   │   ├── config.ts          # 配置状态
│   │   ├── discovery.ts       # 文献发现状态
│   │   ├── knowledge.ts       # 知识库状态
│   │   └── qa.ts              # Q&A 状态
│   ├── services/
│   │   └── api.ts             # HTTP 客户端 (含 SSE stream 方法)
│   └── styles/                # 全局样式 & 设计系统
│
├── server/                    # Layer 2: Node/Hono 网关
│   ├── index.ts               # 入口：Hono app 初始化、路由挂载
│   ├── db/
│   │   └── schema.sql         # SQLite DDL (14 张表)
│   ├── routes/                # 路由模块 (11 个)
│   │   ├── analysis.ts        # 单文献分析 (SSE 代理)
│   │   ├── batch.ts           # 批量分析
│   │   ├── files.ts           # 文件解析 (PDF/DOCX/TXT/MD)
│   │   ├── config.ts          # 配置 CRUD
│   │   ├── history.ts         # 历史记录
│   │   ├── knowledge.ts       # 文档索引网关
│   │   ├── knowledge-bases.ts # 知识库 CRUD
│   │   ├── qa.ts              # Q&A (本地 + RAG)
│   │   ├── discovery.ts       # 文献发现 (Semantic Scholar)
│   │   └── citation.ts        # 引用图谱 (OpenAlex)
│   └── services/              # 服务层
│       ├── storage.ts         # StorageService (better-sqlite3, 700+ 行)
│       ├── python-backend.ts  # PythonBackendClient (HTTP + SSE 代理)
│       ├── openalex.ts        # OpenAlex API 集成
│       └── llm.ts             # LLM 健康检查
│
├── backend/                   # Layer 3: Python AI Core
│   ├── main.py                # FastAPI 入口 (port 8000)
│   ├── api/                   # API 端点
│   │   ├── analysis.py        # /api/analysis/gateway (核心分析流水线)
│   │   └── knowledge.py       # /api/knowledge/* (知识库索引)
│   ├── agents/                # 多 Agent 系统
│   │   ├── base.py            # BaseAgent 抽象类 (call_llm)
│   │   ├── orchestrator.py    # Orchestrator (流水线调度)
│   │   ├── literature.py      # LiteratureParserAgent (分块并行→合并)
│   │   ├── relation.py        # ProjectRelationAgent (跨文献关联)
│   │   ├── writing.py         # WritingAgent (写作素材)
│   │   ├── todo.py            # TodoAgent (待办提取)
│   │   ├── qa.py              # QAAgent (RAG 问答)
│   │   └── readme_advisor.py  # ReadmeAdvisorAgent (README 建议)
│   ├── core/                  # 核心模块
│   │   ├── providers/         # LLM/Embedding Provider 适配层
│   │   │   ├── base.py        # ChatProvider / EmbeddingProvider Protocol
│   │   │   ├── anthropic.py   # Anthropic SDK 适配器
│   │   │   ├── openai_compatible.py # OpenAI 兼容适配器
│   │   │   ├── local_embedding.py   # 本地 Embedding
│   │   │   └── factory.py     # create_chat_provider / create_embedding_provider
│   │   ├── storage.py         # StorageManager (ChromaDB 包装)
│   │   ├── config.py          # ConfigManager (含旧版迁移)
│   │   └── embedding.py       # Embedding 客户端
│   ├── rag/                   # RAG 子系统
│   │   ├── indexer.py         # DocumentIndexer (分块→向量化→存入 ChromaDB)
│   │   └── retriever.py       # RAGRetriever (两层检索：摘要级→内容级)
│   └── models/
│       └── schemas.py         # Pydantic 数据模型
│
├── data/                      # 运行时数据 (SQLite DB、配置等)
├── docs/                      # 设计文档
├── tests/                     # 测试 (Vitest + pytest)
├── scripts/                   # 构建/验证脚本
├── package.json               # Node 依赖 & 脚本
├── vite.config.ts             # Vite 配置
├── tsconfig*.json             # TypeScript 配置 (多目标)
└── electron-builder.yml       # Electron 打包配置
```

---

## 五、核心数据流：单文献分析

```
用户上传 PDF
    │
    ▼
[Frontend] FileUpload → POST /api/files/parse → Node 用 pdf-parse 提取文本
    │
    ▼
[Frontend] useAnalysisStore → api.stream('/api/analysis/single', ...)
    │                              (SSE POST)
    ▼
[Node] analysis.ts 路由
    ├─ 生成 docId (UUID)
    ├─ 从 SQLite 加载知识库上下文 & 用户配置
    ├─ 截断文本至 50,000 字符
    ├─ python.postSSE('/api/analysis/gateway', ...) 转发至 Python
    │
    ▼
[Python] analysis.py → chunk_text() (7000 chars, 500 overlap)
    │
    ▼
[Python] Orchestrator.run_streaming() 串并行流水线
    │
    ├─ Step 1: LiteratureParserAgent (串行入口，内部并行)
    │   ├─ 每个 chunk → ThreadPoolExecutor (max 4) 并行 LLM 提取
    │   └─ 合并 LLM → 8 维阅读卡片 (主题/痛点/方法/数据/结论/创新/局限/一句话)
    │
    ├─ Step 2: ProjectRelationAgent
    │   └─ 阅读卡片 + 用户研究上下文 → 关联分析 (适配度/关系类型/行动建议)
    │
    └─ Step 3: WritingAgent ∥ TodoAgent (并行)
        ├─ WritingAgent → 写作素材 & 结构化资产
        └─ TodoAgent → 实验/阅读/学习待办
    │
    ▼ (SSE events: agent_start → progress → agent_done → complete)
    │
[Node] 收到 complete → 持久化到 SQLite (documents, chunks, history, ...)
    │                 → 转发 complete event 给前端
    ▼
[Frontend] Zustand store 接收 result → AnalysisResult 组件渲染
```

---

## 六、数据库设计 (SQLite, 14 张表)

| 表名 | 用途 |
|------|------|
| `documents` | 已分析文档元数据 |
| `chunks` | 文档分块 (原文片段) |
| `config` | 用户配置 (API key、Provider、研究偏好) |
| `analysis_history` | 分析历史记录 |
| `knowledge_bases` | 知识库定义 |
| `document_knowledge_bases` | 文档-知识库关联 (多对多) |
| `readme_suggestions` | README 更新建议 |
| `discovery_candidates` | 文献发现候选 (Semantic Scholar) |
| `batch_runs` | 批量分析任务 |
| `batch_items` | 批量分析子项 |
| `qa_sessions` | Q&A 会话 |
| `qa_messages` | Q&A 消息 |
| `paper_nodes` | 引用网络节点 |
| `paper_edges` | 引用网络边 |

---

## 七、功能模块一览

| 模块 | 说明 | 关键文件 |
|------|------|----------|
| 单文献分析 | 上传文档→4维分析 (阅读卡片/关联/写作/待办) | `pages/Analysis.tsx`, `routes/analysis.ts`, `api/analysis.py` |
| 批量矩阵 | 多论文交叉对比 | `pages/Batch.tsx`, `routes/batch.ts` |
| 文献发现 | Semantic Scholar 搜索 + 候选保存 | `pages/Discovery.tsx`, `routes/discovery.ts` |
| 引用网络 | OpenAlex 引用图谱 (Canvas 渲染) | `pages/CitationNetwork.tsx`, `routes/citation.ts` |
| 追问 Q&A | 本地模式 (已分析文档) + RAG 模式 (ChromaDB) | `pages/QA.tsx`, `routes/qa.ts`, `rag/retriever.py` |
| 知识库 | 文档上传→分块→向量化→ChromaDB 索引 | `pages/Knowledge.tsx`, `rag/indexer.py` |
| 历史记录 | 分析记录浏览 & 详情查看 | `pages/History.tsx`, `routes/history.ts` |
| 设置 | Provider 配置、健康检查、研究偏好 | `components/SettingsModal.tsx`, `routes/config.ts` |

---

## 八、设计系统

- **风格**: "暖纸学术" — 宣纸质感背景 + 5 级墨色层次
- **字体**: 宋体衬线标题 + 无衬线正文
- **动画**: `wonder-*` 动画体系 (fade-up, scale-in, slide-left)
- **色彩**: 主色 `#5B7F6E` (墨绿), 背景 `#FAF8F3` (暖白)
- **实现**: CSS 自定义变量驱动，支持主题扩展

---

## 九、启动流程 (Electron)

1. `electron/main.ts` 启动 → 动态查找可用端口
2. 从 asar 解压静态文件到 `userData` (版本缓存，避免重复解压)
3. **进程内加载**编译后的 Node 服务器 (无需系统 Node 环境)
4. 等待服务器就绪 → 创建无边框 BrowserWindow
5. Dev: 加载 `http://localhost:5173` (Vite); Prod: 加载内嵌 Hono 服务
6. 自定义标题栏 (最小化/最大化/关闭通过 IPC)
7. 单实例锁保证唯一运行

---

## 十、RAG 两层检索机制

```
用户提问
    │
    ▼
[QAAgent] 判断模式 (本地 / RAG)
    │
    ▼ (RAG 模式)
[RAGRetriever]
    ├─ Layer 1: 摘要级检索
    │   └─ 用户 query → Embedding → ChromaDB 向量搜索 → 匹配文档摘要
    │
    └─ Layer 2: 内容级检索
        └─ 在匹配文档内 → 对 chunks 做向量搜索 → 定位具体片段
    │
    ▼
LLM 生成答案 (附带来源引用)
```

---

## 十一、Provider 适配层

```python
# Protocol 定义 (base.py)
class ChatProvider(Protocol):
    async def chat(self, messages, **kwargs) -> str: ...

class EmbeddingProvider(Protocol):
    async def embed(self, texts) -> list[list[float]]: ...

# 工厂函数 (factory.py)
create_chat_provider(config)     # → AnthropicProvider | OpenAICompatibleProvider
create_embedding_provider(config) # → OpenAI | MiniMax | SiliconFlow | Local
```

所有 Provider 遵循统一 Protocol，切换 Provider 只需改配置，不改业务代码。
