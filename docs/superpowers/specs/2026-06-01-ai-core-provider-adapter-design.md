# AI Core Provider Adapter Design

Date: 2026-06-01
Project: Wonder

## Decision

Wonder will use a local-first desktop architecture. The final application form is a desktop client. Users configure their own model API keys, base URLs, chat models, and embedding models. The application does not depend on a hosted Wonder backend for core AI features.

The target architecture is:

- Desktop shell: Electron.
- Frontend: React, TypeScript, Vite, Ant Design, Zustand.
- Local app gateway: Node/Hono.
- Main local database: SQLite through better-sqlite3.
- AI Core: Python FastAPI.
- Vector index: ChromaDB.
- AI provider integration: Python provider adapter layer.

All AI capabilities must go through Python AI Core. Node/Hono remains the frontend-facing local gateway and keeps the existing frontend API surface stable, but direct LLM execution in Node should be removed.

## Goals

- Keep the desktop client fully local-first.
- Support multiple chat model providers through a unified adapter interface.
- Support separate chat and embedding provider configuration.
- Route all AI features through Python AI Core.
- Preserve the existing frontend API contracts as much as possible.
- Make future AI features easier to add without scattering model calls across frontend, Node, and Python.

## Non-Goals

- No hosted cloud backend in this phase.
- No account system, team sync, billing, or remote storage.
- No migration away from Electron.
- No broad UI redesign.
- No immediate replacement of ChromaDB unless a concrete limitation appears.

## Current State

The current codebase is already closer to the target desktop architecture than the README describes.

- `package.json` uses Electron, React, Vite, Hono, better-sqlite3, Zustand, and Ant Design.
- `server/index.ts` exposes the local Node/Hono API used by the frontend.
- `server/services/storage.ts` owns the local SQLite database schema and access layer.
- `backend/main.py` exposes the Python FastAPI service.
- `backend/api/knowledge.py` already handles RAG, embeddings, and ChromaDB integration.
- `server/services/python-backend.ts` already acts as a client from Node to Python AI Core.

The main architecture problem is duplicated AI responsibility:

- Node has `server/services/llm.ts`, which directly calls an Anthropic-style chat API.
- Python has `backend/core/llm_client.py`, agents, embedding support, and RAG.
- Some analysis behavior currently happens directly in Node routes instead of Python AI Core.

The target design removes this split.

## Architecture Boundary

### Frontend

The frontend only calls Node/Hono routes. It should not call Python AI Core directly.

Responsibilities:

- Render pages and workflows.
- Manage UI state with Zustand.
- Upload files and display streaming or completed AI output.
- Keep existing API paths stable from the user's perspective.

### Node/Hono Local Gateway

Node/Hono is the application gateway, not the AI engine.

Responsibilities:

- Keep the current frontend-facing API routes stable.
- Read and write SQLite application state.
- Validate local request shape.
- Load user configuration from SQLite.
- Forward AI work to Python AI Core.
- Persist AI results returned by Python.
- Stream Python AI responses back to the frontend when needed.
- Serve the production renderer inside Electron.

Node/Hono must not directly call chat or embedding model APIs after the migration.

### Python AI Core

Python AI Core is the only AI execution layer.

Responsibilities:

- Chat model calls.
- Streaming chat model calls.
- Embedding calls.
- Provider health checks.
- Agent orchestration.
- Document chunking for AI/RAG workflows.
- RAG retrieval and answer generation.
- ChromaDB indexing and deletion.
- Future AI features such as reranking, vision, citation expansion, and structured extraction.

### SQLite

SQLite remains the source of truth for application data.

Stores:

- App configuration.
- Documents.
- Analysis history.
- Knowledge bases.
- Document-to-knowledge-base links.
- README suggestions.
- Metadata and workflow results.

SQLite should not be replaced by ChromaDB for business state.

### ChromaDB

ChromaDB is only the vector index.

Stores:

- Embedded document chunks.
- Vector metadata needed for retrieval.

ChromaDB can be rebuilt from SQLite-backed document/chunk metadata if needed.

## Provider Adapter Design

Python AI Core will expose a provider adapter layer with one stable internal interface.

Core interface:

```python
class ChatProvider:
    def chat(self, messages, *, model, temperature, max_tokens, system=None):
        ...

    def stream_chat(self, messages, *, model, temperature, max_tokens, system=None):
        ...

    def health_check(self):
        ...


class EmbeddingProvider:
    def embed(self, texts, *, model, dimensions=None):
        ...

    def health_check(self):
        ...
```

Initial provider adapters:

- `openai_compatible`: OpenAI-compatible chat and embedding APIs.
- `anthropic`: Anthropic Messages API.
- `minimax`: separate adapter only if the selected MiniMax API is not fully OpenAI-compatible.
- `custom_openai_compatible`: same implementation as `openai_compatible`, but configured without provider presets.

Provider presets should help users fill defaults, but the runtime should depend on explicit saved configuration. A preset is not a hard-coded secret or hidden service.

## Configuration Structure

Configuration should distinguish chat models from embedding models.

Suggested normalized shape:

```json
{
  "chat": {
    "provider": "anthropic",
    "preset": "anthropic",
    "apiKey": "",
    "baseUrl": "https://api.anthropic.com/v1",
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.2,
    "maxTokens": 4096
  },
  "embedding": {
    "provider": "openai_compatible",
    "preset": "openai",
    "apiKey": "",
    "baseUrl": "https://api.openai.com/v1",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "knowledge": {
    "enabled": true,
    "autoIndex": true,
    "contextTokenLimit": 12000
  },
  "research": {
    "globalProfile": ""
  }
}
```

Compatibility requirement:

- Existing saved config keys should be migrated or read through a compatibility loader.
- The frontend API should not need to know whether the model call runs in Node or Python.
- The Settings page can evolve to edit this normalized shape, but API path names should remain stable.

## API Flow

### Analysis

Target flow:

1. Frontend calls existing Node analysis API.
2. Node validates the request and loads config from SQLite.
3. Node calls Python AI Core analysis gateway.
4. Python AI Core runs provider adapter and agents.
5. Python returns structured analysis, source chunks, tags, and any README suggestions.
6. Node persists results to SQLite.
7. Node returns or streams results to the frontend through the same frontend-facing route.

### RAG Question Answering

Target flow:

1. Frontend calls existing Node QA API.
2. Node loads knowledge base metadata and global profile from SQLite.
3. Node calls Python `/api/knowledge/ask`.
4. Python retrieves relevant chunks from ChromaDB and calls the configured chat provider.
5. Node returns answer and sources to frontend.

### Embedding and Indexing

Target flow:

1. Frontend or Node initiates indexing through existing API routes.
2. Node passes document content, metadata, and normalized embedding config to Python.
3. Python chunks, embeds, and writes vector data into ChromaDB.
4. Node stores durable metadata in SQLite.

## Migration Plan

1. Add normalized AI configuration types and compatibility loading.
2. Add Python provider adapter package.
3. Move analysis execution from Node direct LLM calls to Python AI Core.
4. Keep Node analysis routes stable while changing their internals to proxy to Python.
5. Remove direct model calls from `server/services/llm.ts` and dependent route logic.
6. Update health checks so Node checks Python AI Core and Python checks configured providers.
7. Update tests around config loading, provider selection, Node-to-Python forwarding, and API compatibility.
8. Update README after implementation to match the actual architecture.

## Parallel Task Breakdown

These tasks are designed so multiple Agents can work in parallel with limited overlap.

### Task 1: Normalized AI Config

Owner: Config Agent

Scope:

- Define normalized chat, embedding, knowledge, and research config types.
- Add compatibility loading for the current `appConfig`, `globalProfile`, and Python `data/config.json` shapes.
- Keep existing Node config API paths stable.
- Add tests for default config, legacy config, and partial config.

Primary files:

- `server/routes/config.ts`
- `server/services/storage.ts`
- `backend/core/config.py`
- `src/stores/config.ts`
- `src/pages/Settings.tsx`

Output:

- A single normalized config shape available to Node and Python.

### Task 2: Python Provider Adapter Layer

Owner: Provider Agent

Scope:

- Create a Python provider adapter package under `backend/core/providers/`.
- Implement `openai_compatible` chat, streaming chat, embeddings, and health check.
- Implement `anthropic` chat, streaming chat, and health check.
- Add a provider factory that builds providers from normalized config.
- Add unit tests with mocked HTTP/API clients.

Primary files:

- `backend/core/llm_client.py`
- `backend/core/embedding.py`
- `backend/core/providers/`
- `backend/tests/`

Output:

- Python AI Core can call chat and embedding providers through a unified interface.

### Task 3: Python AI Gateway Contracts

Owner: AI Gateway Agent

Scope:

- Define Python request/response models for analysis, chat, stream chat if needed, embedding health, and provider health.
- Ensure `/api/analysis/gateway` accepts normalized config or a config reference from Node.
- Ensure `/api/knowledge/ask` uses the provider adapter layer instead of direct model calls.
- Keep structured results compatible with Node persistence.

Primary files:

- `backend/models/schemas.py`
- `backend/api/analysis.py`
- `backend/api/knowledge.py`
- `backend/agents/`

Output:

- Python exposes stable AI Core contracts for Node to call.

### Task 4: Node Gateway Refactor

Owner: Node Gateway Agent

Scope:

- Refactor Node analysis routes to call Python AI Core instead of `LLMService`.
- Preserve frontend-facing paths and response shape.
- Preserve SSE behavior if the current UI depends on streaming progress.
- Remove direct provider-specific request construction from Node.
- Keep SQLite persistence in Node.

Primary files:

- `server/routes/analysis.ts`
- `server/routes/qa.ts`
- `server/services/python-backend.ts`
- `server/services/llm.ts`
- `tests/server/`

Output:

- Existing frontend APIs continue to work while all AI execution runs through Python.

### Task 5: RAG and Indexing Alignment

Owner: RAG Agent

Scope:

- Ensure embedding config flows through Python provider adapter.
- Ensure ChromaDB remains vector-only and SQLite remains business-state source of truth.
- Confirm document deletion removes vector index entries and SQLite metadata through the correct boundary.
- Add tests for knowledge-base scoped retrieval.

Primary files:

- `backend/rag/indexer.py`
- `backend/rag/retriever.py`
- `backend/core/storage.py`
- `backend/api/knowledge.py`
- `backend/tests/test_rag_kb_scope.py`

Output:

- RAG uses normalized embedding providers and respects knowledge-base scope.

### Task 6: Settings UI Compatibility

Owner: Frontend Agent

Scope:

- Update Settings UI to represent separate chat and embedding configuration.
- Keep the user-facing model setup simple.
- Add provider presets for OpenAI-compatible, Anthropic, DeepSeek, MiniMax, and custom OpenAI-compatible.
- Keep frontend calls pointed at existing Node config API.

Primary files:

- `src/pages/Settings.tsx`
- `src/stores/config.ts`
- `src/components/SettingsModal.tsx`
- `src/services/api.ts`

Output:

- Users can configure chat and embedding providers separately without knowing internal architecture.

### Task 7: Verification and Documentation

Owner: Verification Agent

Scope:

- Run frontend, Node, and Python tests.
- Add integration tests for Node-to-Python AI routing where practical.
- Update README architecture and setup instructions after code changes.
- Document how to add a new provider adapter.

Primary files:

- `README.md`
- `tests/`
- `backend/tests/`
- `docs/`

Output:

- Verified architecture, updated documentation, and contributor guidance for new providers.

## Suggested Execution Order

Some tasks can run in parallel, but the cleanest order is:

1. Task 1 and Task 2 in parallel.
2. Task 3 after the initial provider factory exists.
3. Task 4 after Task 3 defines gateway contracts.
4. Task 5 in parallel with Task 4 once embedding adapter shape is stable.
5. Task 6 after Task 1 config shape is stable.
6. Task 7 after implementation tasks are complete.

## Risks

- Streaming compatibility may be the hardest part of preserving frontend behavior.
- Config migration can silently break existing local data if compatibility loading is not tested.
- Python AI Core lifecycle inside Electron packaging needs explicit handling if Python is distributed as a sidecar.
- Provider APIs differ in subtle ways, especially streaming deltas, system prompts, token limits, and error formats.
- Node and Python may temporarily duplicate config parsing during migration; the final state should avoid that duplication.

## Acceptance Criteria

- Existing frontend API paths still work.
- All chat, analysis, embedding, RAG, and AI health checks execute through Python AI Core.
- Node contains no provider-specific chat or embedding API calls.
- Users can configure chat and embedding providers separately.
- At least OpenAI-compatible and Anthropic adapters are implemented and tested.
- RAG uses the configured embedding provider.
- SQLite remains the source of truth for app data.
- ChromaDB remains scoped to vector retrieval.
- README reflects the Electron, React, Node/Hono, Python AI Core, SQLite, and ChromaDB architecture.
