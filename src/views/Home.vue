<template>
  <AppLayout>
    <div class="page-content">
      <section class="page-header">
        <h2>单篇分析</h2>
        <p>选择论文或技术文档，生成阅读卡片、关联分析、写作素材和后续任务。</p>
      </section>

      <div class="upload-card">
        <FileUpload :file-name="analysis.selectedName" @selected="analysis.selectFilePath" />
        <el-button
          type="primary"
          size="large"
          :loading="analysis.loading"
          :disabled="!analysis.selectedPath"
          class="analyze-btn"
          @click="analysis.analyzeSelectedFile"
        >
          开始分析
        </el-button>
      </div>

      <WorkflowStatus v-if="analysis.loading" :current-step="analysis.currentStep" />

      <el-alert v-if="analysis.error" :title="analysis.error" type="error" show-icon class="mt-4" />

      <div v-if="analysis.loading && analysis.streamText" class="stream-card">
        <div class="stream-label">实时输出</div>
        <el-input
          :model-value="analysis.streamText"
          type="textarea"
          :rows="6"
          readonly
          class="stream-box"
        />
      </div>

      <AnalysisResult :result="analysis.result" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import AnalysisResult from '@/components/AnalysisResult.vue'
import FileUpload from '@/components/FileUpload.vue'
import WorkflowStatus from '@/components/WorkflowStatus.vue'
import { useAnalysisStore } from '@/stores/analysis'
import { useConfigStore } from '@/stores/config'

const analysis = useAnalysisStore()
const config = useConfigStore()

onMounted(() => {
  if (!config.loaded) void config.load()
})
</script>

<style scoped>
.upload-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.analyze-btn {
  align-self: flex-end;
  min-width: 160px;
}

.stream-card {
  margin-top: var(--space-md);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.1s;
}

.stream-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.stream-box :deep(.el-textarea__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-caption);
  padding: 0;
  resize: none;
}

.mt-4 {
  margin-top: var(--space-md);
}
</style>
