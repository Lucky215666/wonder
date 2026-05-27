<template>
  <div class="analysis-result" v-if="result">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="阅读卡片" name="reading_card">
        <div class="markdown-body" v-html="renderMarkdown(result.reading_card)" />
      </el-tab-pane>
      <el-tab-pane label="项目关联" name="relation">
        <div class="markdown-body" v-html="renderMarkdown(result.relation_analysis)" />
      </el-tab-pane>
      <el-tab-pane label="写作素材" name="writing">
        <div class="markdown-body" v-html="renderMarkdown(result.writing_materials)" />
      </el-tab-pane>
      <el-tab-pane label="待办清单" name="todo">
        <div class="markdown-body" v-html="renderMarkdown(result.todo_list)" />
      </el-tab-pane>
      <el-tab-pane label="完整报告" name="full">
        <el-button @click="downloadReport" type="primary" style="margin-bottom: 16px">
          下载 Markdown 报告
        </el-button>
        <div class="markdown-body" v-html="renderMarkdown(result.full_report)" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  result: { type: Object, default: null },
})

const activeTab = ref('reading_card')

function renderMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
}

function downloadReport() {
  if (!props.result?.full_report) return
  const blob = new Blob([props.result.full_report], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.result.file_name}_analysis.md`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.markdown-body {
  line-height: 1.8;
  padding: 16px;
}

.markdown-body :deep(h1) {
  font-size: 24px;
  margin: 16px 0 8px;
  color: #1a1a2e;
}

.markdown-body :deep(h2) {
  font-size: 20px;
  margin: 14px 0 6px;
  color: #2d2d4e;
}

.markdown-body :deep(h3) {
  font-size: 16px;
  margin: 12px 0 4px;
}

.markdown-body :deep(ul) {
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}
</style>
