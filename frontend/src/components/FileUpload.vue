<template>
  <el-upload
    ref="uploadRef"
    class="file-upload"
    drag
    :auto-upload="false"
    :limit="1"
    :on-change="handleChange"
    :on-exceed="handleExceed"
    accept=".pdf,.txt,.md,.docx"
  >
    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
    <div class="el-upload__text">
      拖拽文件到此处，或 <em>点击上传</em>
    </div>
    <template #tip>
      <div class="el-upload__tip">
        支持 PDF、TXT、Markdown、DOCX 格式
      </div>
    </template>
  </el-upload>
</template>

<script setup>
import { ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['file-selected'])
const uploadRef = ref(null)

function handleChange(file) {
  emit('file-selected', file.raw)
}

function handleExceed() {
  ElMessage.warning('只能上传一个文件，请先移除已选文件')
}

function clear() {
  uploadRef.value?.clearFiles()
}

defineExpose({ clear })
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.file-upload :deep(.el-upload-dragger) {
  border-color: #f0c040;
  border-radius: 12px;
  padding: 40px;
}

.file-upload :deep(.el-upload-dragger:hover) {
  border-color: #d4a830;
}
</style>
