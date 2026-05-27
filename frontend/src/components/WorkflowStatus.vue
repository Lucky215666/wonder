<template>
  <div class="workflow-status">
    <div
      v-for="step in steps"
      :key="step.id"
      class="step"
      :class="step.status"
    >
      <div class="step-icon">{{ step.id }}</div>
      <div class="step-name">{{ step.name }}</div>
      <div class="step-status">{{ step.label }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentStep: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})

const stepDefs = [
  { id: 1, name: '文献解析' },
  { id: 2, name: '项目关联' },
  { id: 3, name: '写作辅助' },
  { id: 4, name: '任务规划' },
]

const steps = computed(() =>
  stepDefs.map((s) => ({
    ...s,
    status: props.loading
      ? s.id === props.currentStep
        ? 'active'
        : s.id < props.currentStep
        ? 'done'
        : 'pending'
      : 'done',
    label: props.loading
      ? s.id === props.currentStep
        ? '处理中...'
        : s.id < props.currentStep
        ? '已完成'
        : '等待中'
      : '已完成',
  }))
)
</script>

<style scoped>
.workflow-status {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.step {
  flex: 1;
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: #f5f5f5;
}

.step.active {
  background: #fff8e1;
  border: 2px solid #f0c040;
}

.step.done {
  background: #e8f5e9;
}

.step-icon {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.step-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.step-status {
  font-size: 12px;
  color: #666;
}
</style>
