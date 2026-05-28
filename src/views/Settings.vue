<template>
  <AppLayout>
    <div class="page-content">
      <section class="page-header">
        <h2>设置</h2>
        <p>配置 LLM 服务商与研究偏好。</p>
      </section>

      <div class="settings-card">
        <div class="settings-section">
          <div class="section-title">
            <span class="section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="3"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2M4 4l1.4 1.4M10.6 10.6l1.4 1.4M12 4l-1.4 1.4M5.4 10.6L4 12"/></svg>
            </span>
            模型配置
          </div>
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
        </div>

        <div class="settings-section">
          <div class="section-title">
            <span class="section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 2h7l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M10 2v3h3"/><path d="M6 9h4M6 12h2"/></svg>
            </span>
            研究偏好
          </div>
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
        </div>

        <div class="settings-section">
          <div class="section-title">
            <span class="section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v6M5 8h6" stroke-width="1.2"/></svg>
            </span>
            Embedding 配置
          </div>
          <el-form label-position="top" :model="draft" class="settings-form">
            <div class="form-row">
              <el-form-item label="服务商" class="form-col">
                <el-select v-model="draft.embedding!.provider" placeholder="选择 Embedding 服务商">
                  <el-option label="OpenAI" value="OpenAI" />
                  <el-option label="MiniMax" value="MiniMax" />
                  <el-option label="自定义" value="自定义" />
                </el-select>
              </el-form-item>
              <el-form-item label="模型名称" class="form-col">
                <el-input v-model="draft.embedding!.modelName" placeholder="如 text-embedding-3-small" />
              </el-form-item>
            </div>
            <el-form-item label="API Key">
              <el-input v-model="draft.embedding!.apiKey" type="password" show-password placeholder="sk-..." />
            </el-form-item>
            <div class="form-row">
              <el-form-item label="Base URL" class="form-col">
                <el-input v-model="draft.embedding!.baseUrl" placeholder="https://api.openai.com/v1" />
              </el-form-item>
              <el-form-item label="向量维度" class="form-col">
                <el-input-number v-model="draft.embedding!.dimensions" :min="64" :max="4096" :step="64" />
              </el-form-item>
            </div>
          </el-form>
        </div>

        <div class="settings-section">
          <div class="section-title">
            <span class="section-icon">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M5 7h6M5 10h3"/></svg>
            </span>
            知识库配置
          </div>
          <el-form label-position="top" :model="draft" class="settings-form">
            <div class="form-row">
              <el-form-item label="启用知识库" class="form-col">
                <el-switch v-model="draft.knowledge!.enabled" />
              </el-form-item>
              <el-form-item label="分析后自动入库" class="form-col">
                <el-switch v-model="draft.knowledge!.autoIndex" />
              </el-form-item>
            </div>
            <el-form-item label="检索上下文最大 Token 数">
              <el-input-number v-model="draft.knowledge!.maxContextTokens" :min="1000" :max="32000" :step="1000" />
            </el-form-item>
          </el-form>
        </div>

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
  if (!draft.embedding) {
    draft.embedding = {
      provider: 'OpenAI',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
    }
  }
  if (!draft.knowledge) {
    draft.knowledge = {
      enabled: true,
      autoIndex: true,
      maxContextTokens: 8000,
    }
  }
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

.settings-section {
  padding: 20px 24px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--ease-standard);
}

.settings-section:hover {
  border-color: var(--border);
}

.settings-section + .settings-section {
  margin-top: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-secondary);
  margin-bottom: var(--space-md);
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

.section-icon svg {
  width: 16px;
  height: 16px;
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
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
}

.form-actions .el-button {
  min-width: 120px;
}
</style>
