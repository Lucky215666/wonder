<template>
  <el-tabs v-if="result" class="result-tabs">
    <el-tab-pane label="对比矩阵">
      <article v-html="renderMarkdown(result.matrix)" />
    </el-tab-pane>
    <el-tab-pane v-for="file in result.files" :key="file.fileName" :label="file.fileName">
      <article v-html="renderMarkdown(file.readingCard)" />
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import type { BatchResult } from '@/lib/analysis/batch-pipeline'
import { renderMarkdown } from '@/lib/utils/markdown'

defineProps<{ result: BatchResult | null }>()
</script>

<style scoped>
.result-tabs {
  margin-top: 22px;
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.15s;
}

article {
  line-height: 1.8;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  font-family: var(--font-serif);
  color: var(--ink-secondary);
}

article :deep(h1),
article :deep(h2),
article :deep(h3) {
  font-family: var(--font-serif);
  color: var(--ink-dense);
}

article :deep(code) {
  font-family: var(--font-mono);
  background: var(--bg);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.9em;
}

article :deep(pre) {
  background: var(--bg);
  padding: 14px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  border: 1px solid var(--border-light);
}

article :deep(pre code) {
  background: none;
  padding: 0;
}
</style>
