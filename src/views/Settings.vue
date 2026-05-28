<template>
  <AppLayout>
    <div class="page-content">
      <section class="page-header">
        <h2>设置</h2>
        <p>配置 LLM 服务商与研究偏好。</p>
      </section>

      <div class="settings-card">
        <div class="section-title">模型配置</div>
        <el-form label-position="top" :model="draft" class="settings-form">
          <div class="form-row">
            <el-form-item label="服务商" class="form-col">
              <el-select v-model="draft.model.provider" placeholder="选择服务商">
                <el-option label="MiniMax" value="MiniMax" />
                <el-option label="GPT/OpenAI" value="GPT/OpenAI" />
                <el-option label="Claude/Anthropic" value="Claude/Anthropic" />
                <el-option label="DeepSeek" value="DeepSeek" />
                <el-option label="MiMo/Xiaomi" value="MiMo/Xiaomi" />
                <el-option label="自定义" value="自定义" />
              </el-select>
            </el-form-item>
            <el-form-item label="模型名称" class="form-col">
              <el-input v-model="draft.model.modelName" placeholder="如 MiniMax-M2.7" />
            </el-form-item>
          </div>
          <el-form-item label="API Key">
            <el-input v-model="draft.model.apiKey" type="password" show-password placeholder="sk-..." />
          </el-form-item>
          <el-form-item label="Base URL">
            <el-input v-model="draft.model.baseUrl" placeholder="https://api.example.com/v1" />
          </el-form-item>
        </el-form>

        <div class="section-divider"></div>

        <div class="section-title">研究偏好</div>
        <el-form label-position="top" :model="draft" class="settings-form">
          <el-form-item label="研究背景">
            <el-input
              v-model="draft.research.background"
              type="textarea"
              :rows="4"
              placeholder="描述你的研究方向和关注领域，帮助 AI 更好地关联分析"
            />
          </el-form-item>
          <el-form-item label="写作风格">
            <el-input
              v-model="draft.research.writingStyle"
              type="textarea"
              :rows="3"
              placeholder="如：学术正式、简洁明了、偏中文表达..."
            />
          </el-form-item>
        </el-form>

        <div class="form-actions">
          <el-button type="primary" :loading="config.saving" @click="save">保存设置</el-button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { DEFAULT_CONFIG } from '@/lib/core/config'
import type { AppConfig } from '@/lib/llm/types'
import { useConfigStore } from '@/stores/config'

const config = useConfigStore()
const draft = reactive<AppConfig>(structuredClone(DEFAULT_CONFIG))

onMounted(async () => {
  await config.load()
  Object.assign(draft, structuredClone(config.config))
})

async function save() {
  await config.save(structuredClone(draft))
}
</script>

<style scoped>
.settings-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-lg) var(--space-xl);
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-secondary);
  margin-bottom: var(--space-md);
  letter-spacing: 0.02em;
}

.section-divider {
  height: 1px;
  background: var(--border-light);
  margin: var(--space-lg) 0;
  position: relative;
}

.section-divider::before {
  content: "";
  position: absolute;
  left: 50%;
  top: -1px;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: var(--border);
  border-radius: 1.5px;
}

.settings-form {
  max-width: 680px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-row .form-col {
  margin-bottom: 0;
}

.form-actions {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
}

.form-actions .el-button {
  min-width: 120px;
}
</style>
