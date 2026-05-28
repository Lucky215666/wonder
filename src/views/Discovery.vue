<template>
  <AppLayout>
    <div class="page-content">
      <section class="page-header">
        <h2>文献发现</h2>
        <p>通过 Semantic Scholar 搜索学术论文，查看详情并导入分析。</p>
      </section>

      <div class="search-bar">
        <el-input
          v-model="discovery.query"
          placeholder="输入关键词搜索论文..."
          size="large"
          clearable
          @keyup.enter="discovery.search"
        >
          <template #append>
            <el-button :loading="discovery.loading" @click="discovery.search">
              搜索
            </el-button>
          </template>
        </el-input>
      </div>

      <el-alert v-if="discovery.error" :title="discovery.error" type="error" show-icon class="mb-4" />

      <div v-if="discovery.results.length" class="discovery-split">
        <!-- 左栏：结果列表 -->
        <div class="results-list">
          <div class="results-header">
            <span class="result-count">共 {{ discovery.total }} 条，显示前 {{ discovery.results.length }} 条</span>
          </div>
          <div
            v-for="paper in discovery.results"
            :key="paper.paperId"
            class="paper-item"
            :class="{ selected: discovery.selectedPaper?.paperId === paper.paperId }"
            @click="discovery.selectPaper(paper)"
          >
            <div class="paper-title">{{ paper.title }}</div>
            <div class="paper-meta">
              <span>{{ paper.authors.slice(0, 2).map(a => a.name).join(', ') }}{{ paper.authors.length > 2 ? ' et al.' : '' }}</span>
              <span v-if="paper.year">{{ paper.year }}</span>
              <span>引用 {{ paper.citationCount }}</span>
            </div>
          </div>
        </div>

        <!-- 右栏：详情面板 -->
        <div v-if="discovery.selectedPaper" class="detail-panel">
          <div class="detail-title">{{ discovery.selectedPaper.title }}</div>
          <div class="detail-authors">
            {{ discovery.selectedPaper.authors.map(a => a.name).join(', ') }}
          </div>

          <div class="detail-metrics">
            <div v-if="discovery.selectedPaper.year" class="metric-item">
              <div class="metric-value">{{ discovery.selectedPaper.year }}</div>
              <div class="metric-label">年份</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">{{ discovery.selectedPaper.citationCount.toLocaleString() }}</div>
              <div class="metric-label">引用数</div>
            </div>
            <div v-if="discovery.selectedPaper.venue" class="metric-item">
              <div class="metric-value metric-text">{{ discovery.selectedPaper.venue }}</div>
              <div class="metric-label">来源</div>
            </div>
          </div>

          <div v-if="discovery.selectedPaper.abstract" class="detail-section">
            <div class="detail-section-title">摘要</div>
            <p class="abstract">{{ discovery.selectedPaper.abstract }}</p>
          </div>
          <p v-else class="abstract empty">暂无摘要</p>

          <div class="detail-actions">
            <el-button type="primary" size="small" @click="copyAbstract">复制摘要</el-button>
            <el-button
              v-if="discovery.selectedPaper.url"
              tag="a"
              :href="discovery.selectedPaper.url"
              target="_blank"
              size="small"
            >
              在线查看
            </el-button>
            <el-button size="small" @click="discovery.clearSelection">关闭</el-button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/AppLayout.vue'
import { useDiscoveryStore } from '@/stores/discovery'

const discovery = useDiscoveryStore()

function copyAbstract() {
  if (!discovery.selectedPaper) return
  const parts = [discovery.selectedPaper.title]
  if (discovery.selectedPaper.abstract) parts.push(discovery.selectedPaper.abstract)
  const text = parts.join('\n\n')
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制标题和摘要到剪贴板，可粘贴到分析页使用')
  })
}
</script>

<style scoped>
.search-bar {
  margin-bottom: var(--space-md);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.mb-4 {
  margin-bottom: var(--space-md);
}

.discovery-split {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  min-height: 480px;
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.1s;
}

/* 左栏 */
.results-list {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow-y: auto;
  max-height: 600px;
  box-shadow: var(--shadow-sm);
}

.results-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 1;
}

.result-count {
  font-size: 12px;
  color: var(--ink-faint);
}

.paper-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
  border-left: 3px solid transparent;
}

.paper-item:hover {
  background: var(--accent-light);
}

.paper-item.selected {
  background: var(--accent-light);
  border-left-color: var(--accent);
}

.paper-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-secondary);
  margin-bottom: 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.paper-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--ink-ghost);
}

/* 右栏 */
.detail-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  animation: wonder-scale-in 0.25s var(--ease-out) both;
}

.detail-title {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-dense);
  margin-bottom: 8px;
  line-height: 1.4;
}

.detail-authors {
  font-size: 13px;
  color: var(--ink-faint);
  margin-bottom: 16px;
}

.detail-metrics {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.metric-item {
  background: var(--accent-light);
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  text-align: center;
  min-width: 80px;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent);
}

.metric-value.metric-text {
  font-size: 13px;
  font-weight: 600;
}

.metric-label {
  font-size: 11px;
  color: var(--ink-caption);
  margin-top: 2px;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-secondary);
  margin-bottom: 8px;
}

.abstract {
  line-height: 1.8;
  color: var(--ink-secondary);
  font-family: var(--font-serif);
  font-size: 14px;
  margin: 0;
}

.abstract.empty {
  color: var(--ink-ghost);
  font-style: italic;
}

.detail-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

/* 响应式 */
@media (max-width: 1199px) {
  .discovery-split {
    grid-template-columns: 280px 1fr;
  }
}
</style>
