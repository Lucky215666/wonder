<template>
  <section class="file-picker" @dragover.prevent @drop.prevent="onDrop">
    <el-button type="primary" @click="pickFile">选择文件</el-button>
    <p>{{ fileName || '支持 PDF、DOCX、TXT、MD' }}</p>
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
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 180px;
  border: 1px dashed #c8b98d;
  border-radius: 8px;
  background: #fffdfa;
}

.file-picker p {
  margin: 0;
  color: #666;
}
</style>
