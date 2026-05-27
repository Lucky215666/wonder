<template>
  <el-tabs v-if="result" class="result-tabs">
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
    <el-tab-pane label="完整报告">
      <article v-html="renderMarkdown(result.fullReport)" />
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '@/lib/analysis/pipeline'
import { renderMarkdown } from '@/lib/utils/markdown'

defineProps<{ result: AnalysisResult | null }>()
</script>

<style scoped>
.result-tabs {
  margin-top: 22px;
}

article {
  line-height: 1.7;
  padding: 18px;
  background: #fffdfa;
  border: 1px solid #eadfbe;
  border-radius: 8px;
}
</style>
