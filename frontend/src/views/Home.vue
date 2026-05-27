<template>
  <div class="home-view">
    <h2>单篇分析</h2>
    <p class="subtitle">上传论文或技术文档，AI 自动生成结构化阅读卡片</p>

    <el-card class="upload-card">
      <FileUpload ref="uploadRef" @file-selected="onFileSelected" />

      <div v-if="selectedFile" class="file-info">
        <el-tag>{{ selectedFile.name }}</el-tag>
        <el-tag type="info">{{ formatSize(selectedFile.size) }}</el-tag>
      </div>

      <el-button
        type="primary"
        size="large"
        :loading="analysisStore.loading"
        :disabled="!selectedFile"
        @click="startAnalysis"
        class="analyze-btn"
      >
        开始分析
      </el-button>
    </el-card>

    <WorkflowStatus
      v-if="analysisStore.loading"
      :current-step="currentStep"
      :loading="true"
    />

    <el-alert
      v-if="analysisStore.error"
      :title="analysisStore.error"
      type="error"
      show-icon
      closable
      style="margin: 16px 0"
    />

    <AnalysisResult :result="analysisStore.result" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAnalysisStore } from '../stores/analysis'
import FileUpload from '../components/FileUpload.vue'
import WorkflowStatus from '../components/WorkflowStatus.vue'
import AnalysisResult from '../components/AnalysisResult.vue'

const analysisStore = useAnalysisStore()
const selectedFile = ref(null)
const uploadRef = ref(null)
const currentStep = ref(1)

function onFileSelected(file) {
  selectedFile.value = file
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function startAnalysis() {
  if (!selectedFile.value) return

  currentStep.value = 1
  const stepInterval = setInterval(() => {
    if (currentStep.value < 4) currentStep.value++
  }, 10000)

  try {
    await analysisStore.analyze(selectedFile.value)
  } finally {
    clearInterval(stepInterval)
    currentStep.value = 0
  }
}
</script>

<style scoped>
.home-view {
  max-width: 900px;
  margin: 0 auto;
}

.subtitle {
  color: #666;
  margin-bottom: 24px;
}

.upload-card {
  margin-bottom: 24px;
}

.file-info {
  margin: 16px 0;
  display: flex;
  gap: 8px;
}

.analyze-btn {
  width: 100%;
  margin-top: 16px;
  background: #1a1a2e;
  border-color: #1a1a2e;
}

.analyze-btn:hover {
  background: #2d2d4e;
}
</style>
