<template>
  <section class="file-picker" @dragover.prevent @drop.prevent="onDrop">
    <div class="picker-content">
      <div class="picker-icon">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M16 20V8M11 12l5-5 5 5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 18v6a2 2 0 002 2h16a2 2 0 002-2v-6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <el-button type="primary" size="small" @click="pickFile">选择文件</el-button>
      <p class="picker-hint">{{ fileName || '支持 PDF、DOCX、TXT、MD，或拖拽到此处' }}</p>
      <p v-if="fileName" class="file-selected">{{ fileName }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { open } from '@tauri-apps/plugin-dialog'

defineProps<{ fileName?: string }>()
const emit = defineEmits<{ selected: [path: string] }>()

async function pickFile() {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] }],
  })
  if (typeof selected === 'string') emit('selected', selected)
}

function onDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  const path = file ? (file as File & { path?: string }).path : undefined
  if (path) emit('selected', path)
}
</script>

<style scoped>
.file-picker {
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard);
  cursor: pointer;
}

.file-picker:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}

.picker-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
}

.picker-icon {
  width: 36px;
  height: 36px;
  color: var(--ink-ghost);
  transition: color var(--duration-fast) var(--ease-standard);
}

.file-picker:hover .picker-icon {
  color: var(--accent);
}

.picker-icon svg {
  width: 100%;
  height: 100%;
}

.picker-hint {
  margin: 0;
  color: var(--ink-faint);
  font-size: 12px;
}

.file-selected {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
