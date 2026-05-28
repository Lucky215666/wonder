<template>
  <AppLayout>
    <div class="page-content">
      <section class="page-header">
        <h2>{{ record?.fileName || '历史详情' }}</h2>
      </section>
      <div class="detail-card">
        <AnalysisResult v-if="record" :result="record" :record="record" />
        <div v-else class="empty-state">
          <span>记录不存在</span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import AnalysisResult from '@/components/AnalysisResult.vue'
import type { HistoryRecord } from '@/lib/core/history'
import { useAnalysisStore } from '@/stores/analysis'

const props = defineProps<{ id: string }>()
const analysis = useAnalysisStore()
const record = ref<HistoryRecord | null>(null)

onMounted(async () => {
  record.value = await analysis.loadHistoryRecord(props.id)
})
</script>

<style scoped>
.detail-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: var(--ink-faint);
  font-size: 14px;
}
</style>
