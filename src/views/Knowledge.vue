<template>
  <AppLayout>
    <div class="page-content knowledge-page">
      <!-- Error banner -->
      <el-alert
        v-if="knowledge.error"
        :title="knowledge.error"
        type="error"
        show-icon
        closable
        class="error-banner"
        @close="knowledge.error = ''"
      />

      <section class="page-header">
        <div class="header-left">
          <h2>知识库</h2>
          <p>管理已入库的文献，搜索知识片段。</p>
        </div>
        <div class="header-actions">
          <el-button
            type="primary"
            :loading="knowledge.uploading"
            @click="triggerUpload"
          >
            <el-icon class="btn-icon"><Upload /></el-icon>
            上传文献
          </el-button>
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.docx,.txt,.md"
            hidden
            @change="handleFileChange"
          />
        </div>
      </section>

      <!-- Search bar -->
      <div class="search-bar">
        <el-input
          v-model="searchText"
          placeholder="搜索知识片段..."
          clearable
          @keydown.enter.prevent="doSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button
          type="primary"
          :loading="knowledge.searching"
          :disabled="!searchText.trim()"
          @click="doSearch"
        >
          搜索
        </el-button>
      </div>

      <!-- Search results -->
      <section v-if="knowledge.searchResults.length" class="search-results">
        <div class="section-title-row">
          <h3 class="section-title">搜索结果</h3>
          <span class="result-count">{{ knowledge.searchResults.length }} 条匹配</span>
        </div>
        <div
          v-for="(result, idx) in knowledge.searchResults"
          :key="result.id"
          class="result-item"
          :style="{ '--i': Math.min(idx, 8) }"
        >
          <div class="result-snippet">
            <span class="snippet-quote">&ldquo;</span>
            {{ result.document }}
          </div>
          <div class="result-meta">
            <el-tag size="small" type="info" effect="plain">相似度 {{ (1 - result.distance).toFixed(2) }}</el-tag>
          </div>
        </div>
      </section>

      <!-- Document list -->
      <section v-if="knowledge.loading" class="loading-state">
        <el-icon class="loading-spinner"><Loading /></el-icon>
        <span>加载中...</span>
      </section>

      <section v-else-if="knowledge.documents.length" class="doc-list">
        <div
          v-for="(doc, idx) in knowledge.documents"
          :key="doc.id"
          class="doc-card"
          :style="{ '--i': Math.min(idx, 8) }"
        >
          <div class="doc-card-accent"></div>
          <div class="doc-card-body" @click="openDetail(doc.id)">
            <div class="doc-card-title">{{ doc.file_name }}</div>
            <div class="doc-card-summary">{{ doc.summary }}</div>
            <div class="doc-card-meta">
              <span class="meta-item">
                <el-icon><Document /></el-icon>
                {{ doc.chunk_count }} 片段
              </span>
              <span class="meta-item">
                <el-icon><Tickets /></el-icon>
                {{ doc.total_tokens }} tokens
              </span>
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDate(doc.created_at) }}
              </span>
            </div>
          </div>
          <div class="doc-card-actions">
            <el-button
              text
              type="danger"
              size="small"
              @click.stop="handleDelete(doc.id, doc.file_name)"
            >
              删除
            </el-button>
          </div>
        </div>
      </section>

      <!-- Empty state -->
      <section v-else class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2">
            <rect x="8" y="4" width="24" height="32" rx="3" />
            <path d="M32 12h6a3 3 0 013 3v24a3 3 0 01-3 3H14a3 3 0 01-3-3v-6" />
            <path d="M16 20h8M16 26h5" />
            <circle cx="34" cy="34" r="8" fill="var(--bg)" />
            <path d="M34 30v8M30 34h8" stroke-width="1.5" />
          </svg>
        </div>
        <span class="empty-title">知识库为空</span>
        <span class="empty-desc">上传文献开始构建</span>
        <el-button type="primary" @click="triggerUpload">
          <el-icon class="btn-icon"><Upload /></el-icon>
          上传文献
        </el-button>
      </section>

      <!-- Detail drawer -->
      <el-drawer
        v-model="drawerVisible"
        :title="knowledge.currentDetail?.file_name ?? '文档详情'"
        direction="rtl"
        size="520px"
        :before-close="closeDrawer"
      >
        <div v-if="knowledge.detailLoading" class="drawer-loading">
          <el-icon class="loading-spinner"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <div v-else-if="knowledge.currentDetail" class="drawer-content">
          <el-tabs v-model="activeTab" class="detail-tabs">
            <el-tab-pane label="阅读卡片" name="reading_card">
              <div class="tab-body serif-text">
                {{ knowledge.currentDetail.reading_card }}
              </div>
            </el-tab-pane>
            <el-tab-pane label="关联分析" name="relation_analysis">
              <div class="tab-body serif-text">
                {{ knowledge.currentDetail.relation_analysis }}
              </div>
            </el-tab-pane>
            <el-tab-pane label="写作素材" name="writing_materials">
              <div class="tab-body serif-text">
                {{ knowledge.currentDetail.writing_materials }}
              </div>
            </el-tab-pane>
            <el-tab-pane label="任务清单" name="todo_list">
              <div class="tab-body serif-text">
                {{ knowledge.currentDetail.todo_list }}
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-drawer>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  Upload,
  Search,
  Loading,
  Document,
  Tickets,
  Clock,
} from '@element-plus/icons-vue'
import AppLayout from '@/components/AppLayout.vue'
import { useKnowledgeStore } from '@/stores/knowledge'

const knowledge = useKnowledgeStore()

const fileInput = ref<HTMLInputElement | null>(null)
const searchText = ref('')
const drawerVisible = ref(false)
const activeTab = ref('reading_card')

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  try {
    await knowledge.upload(file)
  } catch {
    // error already set in store
  }
}

function doSearch() {
  knowledge.search(searchText.value)
}

async function openDetail(docId: string) {
  drawerVisible.value = true
  activeTab.value = 'reading_card'
  await knowledge.loadDetail(docId)
}

function closeDrawer() {
  drawerVisible.value = false
}

async function handleDelete(docId: string, fileName: string) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${fileName}」？此操作不可撤销。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await knowledge.remove(docId)
  } catch {
    // cancelled
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

onMounted(() => {
  knowledge.loadDocuments()
})
</script>

<style scoped>
.knowledge-page {
  animation: wonder-fade-up 0.2s var(--ease-out) both;
}

.error-banner {
  margin-bottom: var(--space-md);
}

/* --- Header --- */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-lg);
}

.header-left h2 {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-dense);
  margin: 0 0 4px;
}

.header-left p {
  font-size: 13px;
  color: var(--ink-caption);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-icon {
  margin-right: 4px;
}

/* --- Search bar --- */
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: var(--space-lg);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.search-bar .el-input {
  flex: 1;
}

/* --- Search results --- */
.search-results {
  margin-bottom: var(--space-lg);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
}

.section-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-secondary);
  margin: 0;
}

.result-count {
  font-size: 12px;
  color: var(--ink-ghost);
}

.result-item {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 14px 18px;
  margin-bottom: 8px;
  transition: border-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: calc(var(--i) * 0.04s);
}

.result-item:hover {
  border-left-color: var(--accent-hover);
  box-shadow: var(--shadow-sm);
}

.result-snippet {
  font-size: 13px;
  color: var(--ink-secondary);
  line-height: 1.7;
  margin-bottom: 8px;
  font-family: var(--font-serif);
  position: relative;
}

.snippet-quote {
  color: var(--accent);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  margin-right: 2px;
  vertical-align: -2px;
  opacity: 0.5;
}

.result-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* --- Document list --- */
.doc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 0;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
  transition:
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-standard);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: calc(var(--i) * 0.05s);
}

.doc-card-accent {
  width: 3px;
  background: var(--border-light);
  flex-shrink: 0;
  transition: background var(--duration-fast) var(--ease-standard),
    width var(--duration-fast) var(--ease-standard);
  border-radius: var(--radius-card) 0 0 var(--radius-card);
}

.doc-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--accent);
}

.doc-card:hover .doc-card-accent {
  background: var(--accent);
  width: 4px;
}

.doc-card-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  padding: 16px 20px;
}

.doc-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-dense);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-card-summary {
  font-size: 13px;
  color: var(--ink-caption);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.doc-card-meta {
  display: flex;
  gap: 16px;
  align-items: center;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ink-faint);
}

.doc-card-actions {
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-standard);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-right: 16px;
}

.doc-card:hover .doc-card-actions {
  opacity: 1;
}

/* --- Loading --- */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  gap: 12px;
  color: var(--ink-faint);
  font-size: 14px;
}

.loading-spinner {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* --- Empty state --- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  gap: 12px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  color: var(--border);
  margin-bottom: 4px;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-secondary);
}

.empty-desc {
  font-size: 13px;
  color: var(--ink-faint);
  margin-bottom: 8px;
}

/* --- Drawer --- */
.drawer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 12px;
  color: var(--ink-faint);
  font-size: 14px;
}

/* Drawer header accent */
:deep(.el-drawer__header) {
  border-bottom: 1px solid var(--border-light);
  padding: 16px 20px;
  margin-bottom: 0;
}

:deep(.el-drawer__body) {
  padding: 20px;
}

.drawer-content {
  padding: 0 4px;
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-light);
}

.detail-tabs :deep(.el-tabs__item) {
  font-size: 13px;
  padding: 0 16px;
}

.tab-body {
  font-size: 14px;
  line-height: 1.9;
  color: var(--ink-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  padding: 16px;
  background: var(--bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.serif-text {
  font-family: var(--font-serif);
}
</style>
