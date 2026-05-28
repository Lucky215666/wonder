<template>
  <AppLayout>
    <div class="page-content">
      <section class="page-header">
        <h2>引用网络</h2>
        <p>输入论文 ID，构建引用关系图谱，直观查看引用与被引用网络。</p>
      </section>

      <div class="controls-card">
        <el-input
          v-model="citation.seedPaperId"
          placeholder="输入 Semantic Scholar Paper ID（如 649def34f8be...）"
          size="large"
          clearable
          @keyup.enter="citation.buildGraph"
        >
          <template #append>
            <el-button :loading="citation.loading" @click="citation.buildGraph">
              构建引用网络
            </el-button>
          </template>
        </el-input>
        <div class="controls-row">
          <span class="label">展开深度</span>
          <el-radio-group v-model="citation.depth" size="small">
            <el-radio :value="1">1 层</el-radio>
            <el-radio :value="2">2 层</el-radio>
          </el-radio-group>
          <span class="label sep">每篇取引用数</span>
          <el-input-number v-model="citation.limit" :min="3" :max="20" size="small" />
        </div>
      </div>

      <el-alert v-if="citation.error" :title="citation.error" type="error" show-icon class="mb-4" />

      <div v-if="citation.graph" class="graph-card">
        <div class="graph-header">
          <div class="graph-legend">
            <span class="legend-item"><span class="dot seed"></span>种子论文</span>
            <span class="legend-item"><span class="dot ref"></span>参考文献</span>
            <span class="legend-item"><span class="dot cit"></span>引用该论文</span>
          </div>
        </div>
        <canvas
          ref="canvasRef"
          class="graph-canvas"
          @click="handleClick"
          @mousemove="handleHover"
        />
      </div>

      <div v-if="citation.selectedNode" class="detail-panel">
        <h3>{{ citation.selectedNode.title }}</h3>
        <div class="detail-meta">
          <span v-if="citation.selectedNode.year">年份：{{ citation.selectedNode.year }}</span>
          <span>引用数：{{ citation.selectedNode.citationCount }}</span>
        </div>
        <div class="detail-actions">
          <el-button type="primary" size="small" @click="expandFromNode">
            以此节点展开
          </el-button>
          <el-button
            v-if="citation.selectedNode.paperId"
            tag="a"
            :href="`https://www.semanticscholar.org/paper/${citation.selectedNode.paperId}`"
            target="_blank"
            size="small"
          >
            在 Semantic Scholar 查看
          </el-button>
          <el-button size="small" @click="citation.selectNode(null)">关闭</el-button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { useCitationStore } from '@/stores/citation'
import type { GraphNode } from '@/lib/discovery/citation-graph'

const citation = useCitationStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

const COLORS = {
  seed: '#5B7F6E',
  references: '#7A9BB5',
  citations: '#B5846E',
  seedEdge: 'rgba(91,127,110,0.35)',
  refEdge: 'rgba(122,155,181,0.25)',
  citEdge: 'rgba(181,132,110,0.25)',
  selected: '#C45B4A',
  label: '#2C2A26',
  labelBg: 'rgba(255,253,249,0.9)',
}

const NODE_RADIUS = 18
const HIT_RADIUS = 24

function getNodeColor(node: GraphNode): string {
  if (node.paperId === citation.seedPaperId) return COLORS.seed
  if (!citation.graph) return COLORS.references
  const isCitation = citation.graph.edges.some(
    e => e.type === 'citations' && e.from === node.paperId,
  )
  return isCitation ? COLORS.citations : COLORS.references
}

function getEdgeColor(type: 'references' | 'citations'): string {
  return type === 'references' ? COLORS.refEdge : COLORS.citEdge
}

function drawGraph() {
  const canvas = canvasRef.value
  if (!canvas || !citation.graph) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, rect.width, rect.height)

  const { nodes, edges } = citation.graph

  for (const edge of edges) {
    const from = nodes.find(n => n.paperId === edge.from)
    const to = nodes.find(n => n.paperId === edge.to)
    if (!from || !to) continue

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = getEdgeColor(edge.type)
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  for (const node of nodes) {
    const isSelected = citation.selectedNode?.paperId === node.paperId
    const color = getNodeColor(node)

    ctx.beginPath()
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    if (isSelected) {
      ctx.strokeStyle = COLORS.selected
      ctx.lineWidth = 3
      ctx.stroke()
    }

    const label = truncate(node.title, 18)
    ctx.font = '11px sans-serif'
    const metrics = ctx.measureText(label)
    const labelX = node.x - metrics.width / 2
    const labelY = node.y + NODE_RADIUS + 14

    ctx.fillStyle = COLORS.labelBg
    ctx.fillRect(labelX - 3, labelY - 10, metrics.width + 6, 14)

    ctx.fillStyle = COLORS.label
    ctx.fillText(label, labelX, labelY)
  }
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function findNodeAt(x: number, y: number): GraphNode | null {
  if (!citation.graph) return null
  for (const node of citation.graph.nodes) {
    const dx = x - node.x
    const dy = y - node.y
    if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
      return node
    }
  }
  return null
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function handleClick(e: MouseEvent) {
  const coords = getCanvasCoords(e)
  if (!coords) return
  const node = findNodeAt(coords.x, coords.y)
  citation.selectNode(node)
}

function handleHover(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const coords = getCanvasCoords(e)
  if (!coords) return
  const node = findNodeAt(coords.x, coords.y)
  canvas.style.cursor = node ? 'pointer' : 'default'
}

function expandFromNode() {
  if (!citation.selectedNode) return
  citation.seedPaperId = citation.selectedNode.paperId
  citation.buildGraph()
}

watch(() => citation.graph, () => {
  nextTick(drawGraph)
})

watch(() => citation.selectedNode, () => {
  drawGraph()
})

onMounted(() => {
  if (citation.graph) drawGraph()
})
</script>

<style scoped>
.controls-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.controls-row .label {
  font-size: 13px;
  color: var(--ink-caption);
}

.controls-row .sep {
  margin-left: 16px;
}

.mb-4 {
  margin-bottom: var(--space-md);
}

.graph-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  margin-bottom: var(--space-md);
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.1s;
}

.graph-header {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-light);
}

.graph-legend {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--ink-caption);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.seed {
  background: #5B7F6E;
}

.dot.ref {
  background: #7A9BB5;
}

.dot.cit {
  background: #B5846E;
}

.graph-canvas {
  width: 100%;
  height: 480px;
  display: block;
  background: var(--bg);
}

.detail-panel {
  padding: var(--space-lg);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
}

.detail-panel h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-family: var(--font-serif);
  line-height: 1.4;
  color: var(--ink-dense);
}

.detail-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--ink-caption);
}

.detail-actions {
  display: flex;
  gap: 8px;
}
</style>
