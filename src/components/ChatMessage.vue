<template>
  <div class="chat-message" :class="role">
    <div class="bubble" v-html="renderedContent" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/lib/utils/markdown'

const props = defineProps<{ role: 'user' | 'assistant'; content: string }>()

const renderedContent = computed(() =>
  props.role === 'assistant' ? renderMarkdown(props.content) : escapeHtml(props.content),
)

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}
</script>

<style scoped>
.chat-message {
  display: flex;
  margin-bottom: 12px;
  animation: wonder-fade-up 0.2s var(--ease-out) both;
}

.chat-message.user {
  justify-content: flex-end;
}

.chat-message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 10px;
  line-height: 1.7;
  word-break: break-word;
}

.user .bubble {
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 6px rgba(91, 127, 110, 0.2);
}

.assistant .bubble {
  background: var(--bg-card);
  color: var(--ink-secondary);
  border: 1px solid var(--border);
  border-left: 2px solid var(--accent);
  border-bottom-left-radius: 4px;
  font-family: var(--font-serif);
  font-size: 15px;
  box-shadow: var(--shadow-sm);
}

.bubble :deep(p) {
  margin: 0 0 8px;
}

.bubble :deep(p:last-child) {
  margin-bottom: 0;
}

.bubble :deep(code) {
  background: var(--bg);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: var(--font-mono);
}

.bubble :deep(pre) {
  background: var(--bg);
  padding: 10px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  border: 1px solid var(--border-light);
}

.bubble :deep(pre code) {
  background: none;
  padding: 0;
}

.bubble :deep(ul),
.bubble :deep(ol) {
  padding-left: 20px;
  margin: 4px 0;
}
</style>
