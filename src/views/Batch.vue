<template>
  <AppLayout>
    <div class="page-content">
      <section class="page-header">
        <h2>批量文献矩阵</h2>
        <p>选择多篇论文或文档，生成横向对比矩阵，快速发现研究差异与空白。</p>
      </section>

      <div class="upload-card">
        <section class="file-picker" @dragover.prevent @drop.prevent="onDrop">
          <div class="picker-icon">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="4" y="6" width="24" height="20" rx="3"/><path d="M4 13h24M12 6v7M20 6v7"/></svg>
          </div>
          <el-button type="primary" @click="pickFiles">选择文件（可多选）</el-button>
          <p class="picker-hint">支持 PDF、DOCX、TXT、MD，至少选择 2 个文件</p>
        </section>

        <div v-if="batch.files.length" class="file-list">
          <div v-for="(file, index) in batch.files" :key="file.path" class="file-item">
            <span class="file-name">{{ file.name }}</span>
            <el-button text type="danger" size="small" @click="batch.removeFile(index)">移除</el-button>
          </div>
        </div>

        <div v-if="batch.files.length" class="actions">
          <el-button
            type="primary"
            size="large"
            :loading="batch.loading"
            :disabled="batch.files.length < 2"
            class="run-btn"
            @click="batch.runBatch"
          >
            开始对比分析
          </el-button>
          <el-button v-if="batch.result" size="large" @click="batch.clear">清空重来</el-button>
        </div>
      </div>

      <BatchWorkflowStatus
        v-if="batch.loading"
        :current-step="batch.currentStep"
        :current-file-index="batch.currentFileIndex"
        :file-names="batch.files.map(f => f.name)"
      />

      <el-alert v-if="batch.error" :title="batch.error" type="error" show-icon class="mt-4" />

      <div v-if="batch.loading && batch.streamText" class="stream-card">
        <div class="stream-label">实时输出</div>
        <el-input
          :model-value="batch.streamText"
          type="textarea"
          :rows="6"
          readonly
          class="stream-box"
        />
      </div>

      <BatchResult :result="batch.result" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { open } from '@tauri-apps/plugin-dialog'
import AppLayout from '@/components/AppLayout.vue'
import BatchResult from '@/components/BatchResult.vue'
import BatchWorkflowStatus from '@/components/BatchWorkflowStatus.vue'
import { useBatchStore } from '@/stores/batch'

const batch = useBatchStore()

async function pickFiles() {
  const selected = await open({
    multiple: true,
    filters: [{ name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] }],
  })
  if (selected) {
    const paths = Array.isArray(selected) ? selected : [selected]
    batch.addFiles(paths)
  }
}

function onDrop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (!files?.length) return
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const path = (files[i] as File & { path?: string }).path
    if (path) paths.push(path)
  }
  if (paths.length) batch.addFiles(paths)
}
</script>

<style scoped>
.upload-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.file-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 120px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard);
}

.file-picker:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}

.picker-icon {
  width: 36px;
  height: 36px;
  color: var(--ink-faint);
}

.picker-icon svg {
  width: 100%;
  height: 100%;
}

.picker-hint {
  margin: 0;
  color: var(--ink-faint);
  font-size: 13px;
}

.file-list {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
}

.file-name {
  font-size: 13px;
  color: var(--ink-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  margin-top: var(--space-md);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.run-btn {
  min-width: 160px;
}

.stream-card {
  margin-top: var(--space-md);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 12px 16px;
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
