<template>
  <div class="history-view">
    <h2>历史记录</h2>

    <el-input
      v-model="search"
      placeholder="按文件名搜索..."
      clearable
      class="search-input"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <el-table
      v-loading="loading"
      :data="filteredItems"
      style="width: 100%"
      empty-text="暂无历史记录"
    >
      <el-table-column prop="file_name" label="文件名" min-width="200" />
      <el-table-column prop="model" label="模型" width="150" />
      <el-table-column prop="summary" label="摘要" min-width="250" show-overflow-tooltip />
      <el-table-column label="分析时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="$router.push(`/history/${row.id}`)">
            查看
          </el-button>
          <el-button type="danger" link @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getHistory, deleteHistoryItem } from '../api'

const items = ref([])
const search = ref('')
const loading = ref(false)

const filteredItems = computed(() => {
  if (!search.value) return items.value
  const keyword = search.value.toLowerCase()
  return items.value.filter((item) =>
    item.file_name.toLowerCase().includes(keyword)
  )
})

function formatTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN')
}

async function fetchHistory() {
  loading.value = true
  try {
    const { data } = await getHistory()
    items.value = data.items || []
  } catch (err) {
    ElMessage.error('加载历史记录失败')
  } finally {
    loading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${row.file_name}」的分析记录吗？`,
      '确认删除',
      { type: 'warning' }
    )
    await deleteHistoryItem(row.id)
    items.value = items.value.filter((item) => item.id !== row.id)
    ElMessage.success('已删除')
  } catch {
    // user cancelled or delete failed — no action needed
  }
}

onMounted(fetchHistory)
</script>

<style scoped>
.history-view {
  max-width: 1100px;
  margin: 0 auto;
}

.search-input {
  margin-bottom: 20px;
}
</style>
