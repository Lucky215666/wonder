<template>
  <div class="history-detail-view" v-loading="loading">
    <div class="page-header">
      <el-button @click="$router.push('/history')" link>
        &larr; 返回历史记录
      </el-button>
    </div>

    <template v-if="item">
      <h2>{{ item.file_name }}</h2>
      <AnalysisResult :result="item" />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHistoryItem } from '../api'
import AnalysisResult from '../components/AnalysisResult.vue'

const route = useRoute()
const item = ref(null)
const loading = ref(false)

async function fetchItem() {
  loading.value = true
  try {
    const { data } = await getHistoryItem(route.params.id)
    item.value = data
  } catch (err) {
    ElMessage.error('加载分析详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchItem)
</script>

<style scoped>
.history-detail-view {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 16px;
}
</style>
