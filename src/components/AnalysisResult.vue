<template>
  <div v-if="result" class="result-container">
    <el-tabs class="result-tabs">
      <el-tab-pane label="阅读卡片">
        <article v-html="renderMarkdown(result.readingCard)" />
      </el-tab-pane>
      <el-tab-pane label="关联分析">
        <article v-html="renderMarkdown(result.relationAnalysis)" />
      </el-tab-pane>
      <el-tab-pane label="写作素材">
        <article v-html="renderMarkdown(result.writingMaterials)" />
      </el-tab-pane>
      <el-tab-pane label="待办清单">
        <article v-html="renderMarkdown(result.todoList)" />
      </el-tab-pane>
      <el-tab-pane v-if="result.matching" label="方向匹配">
        <article v-html="renderMarkdown(result.matching!)" />
      </el-tab-pane>
      <el-tab-pane label="完整报告">
        <article v-html="renderMarkdown(result.fullReport)" />
      </el-tab-pane>
    </el-tabs>
    <ExportButtons v-if="record" :record="record" />
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '@/lib/analysis/pipeline'
import type { HistoryRecord } from '@/lib/core/history'
import { renderMarkdown } from '@/lib/utils/markdown'
import ExportButtons from './ExportButtons.vue'

defineProps<{ result: AnalysisResult | null; record?: HistoryRecord | null }>()
</script>

<style scoped>
.result-container {
  margin-top: var(--space-lg);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.15s;
}

.result-tabs {
  --el-tabs-header-height: 44px;
}

.result-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 8px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}

.result-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.result-tabs :deep(.el-tabs__content) {
  padding: 0;
}

.result-tabs :deep(.el-tab-pane) {
  padding: 0;
}

article {
  line-height: 1.8;
  padding: 24px 28px;
  font-family: var(--font-serif);
  color: var(--ink-secondary);
  font-size: 14.5px;
}

article :deep(h1) {
  font-size: 22px;
  margin: 0 0 16px;
  font-family: var(--font-serif);
  color: var(--ink-dense);
}

article :deep(h2) {
  font-size: 18px;
  margin: 20px 0 12px;
  font-family: var(--font-serif);
  color: var(--ink-dense);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 8px;
}

article :deep(h3) {
  font-size: 16px;
  margin: 16px 0 8px;
  font-family: var(--font-serif);
  color: var(--ink-dense);
}

article :deep(p) {
  margin: 0 0 10px;
}

article :deep(code) {
  font-family: var(--font-mono);
  background: var(--bg);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.88em;
}

article :deep(pre) {
  background: var(--bg);
  padding: 16px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  border: 1px solid var(--border-light);
  margin: 12px 0;
}

article :deep(pre code) {
  background: none;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 13px;
}

article :deep(blockquote) {
  border-left: 3px solid var(--accent);
  margin: 12px 0;
  padding: 10px 16px;
  color: var(--ink-caption);
  background: var(--accent-light);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

article :deep(ul),
article :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

article :deep(li) {
  margin: 4px 0;
}

article :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

article :deep(th),
article :deep(td) {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}

article :deep(th) {
  background: var(--bg);
  font-weight: 600;
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--ink-caption);
}

article :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 20px 0;
}

.export-bar {
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 8px;
}
</style>
