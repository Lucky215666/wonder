<template>
  <div class="workflow">
    <div v-for="item in steps" :key="item.key" class="step" :class="{ active: item.key === currentStep, done: isDone(item.key) }">
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisStep } from '@/lib/analysis/pipeline'

const props = defineProps<{ currentStep: AnalysisStep | '' }>()

const steps: Array<{ key: AnalysisStep; label: string }> = [
  { key: 'reading', label: '文献解析' },
  { key: 'relation', label: '关联分析' },
  { key: 'writing', label: '写作素材' },
  { key: 'todo', label: '任务清单' },
  { key: 'saving', label: '保存记录' },
]

function isDone(key: AnalysisStep) {
  const current = steps.findIndex(step => step.key === props.currentStep)
  const target = steps.findIndex(step => step.key === key)
  return current > target || props.currentStep === 'done'
}
</script>

<style scoped>
.workflow {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin: 18px 0;
}

.step {
  min-height: 40px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  border: 1px solid #ddd2b4;
  background: #fffdfa;
  color: #777;
}

.step.active {
  border-color: #f0c040;
  color: #1a1a2e;
  font-weight: 700;
}

.step.done {
  background: #f7efd4;
  color: #1a1a2e;
}
</style>
