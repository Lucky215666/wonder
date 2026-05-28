# 文答 前端全面翻新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将"文答"前端从个人项目感升级为可公开发布的专业产品，强化暖纸学术风格。

**Architecture:** 基于现有 CSS custom properties 设计系统，升级 token 体系（5 级墨色、多层阴影、动画系统），叠加宣纸纹理，重构侧栏导航，翻新所有页面组件和 Element Plus 覆盖样式。

**Tech Stack:** Vue 3 + TypeScript + Element Plus + CSS Custom Properties + Tauri v2

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/styles/main.css` | 设计系统核心：tokens、纹理、动画、Element Plus 覆盖 |
| `src/App.vue` | 路由过渡 `<Transition>` |
| `src/components/AppLayout.vue` | 侧栏品牌区 + 分组导航 + 纹理 |
| `src/components/FileUpload.vue` | 文件上传（图标+双行提示+hover 增强） |
| `src/components/ChatMessage.vue` | 聊天气泡（阴影+竖线+衬线字体） |
| `src/components/WorkflowStatus.vue` | 工作流步骤（呼吸光点+卡片化） |
| `src/components/BatchWorkflowStatus.vue` | 批量工作流步骤（同上风格） |
| `src/components/ExportButtons.vue` | 导出按钮（图标+成功反馈） |
| `src/components/AnalysisResult.vue` | 分析结果（tabs 样式微调） |
| `src/components/BatchResult.vue` | 批量结果（容器样式微调） |
| `src/views/Home.vue` | 单篇分析（拖拽区增强+入场动画） |
| `src/views/Batch.vue` | 批量分析（拖拽区增强+入场动画） |
| `src/views/QA.vue` | 追溯问答（chat 容器样式升级） |
| `src/views/History.vue` | 历史记录（表格→卡片列表） |
| `src/views/HistoryDetail.vue` | 历史详情（卡片样式微调） |
| `src/views/Discovery.vue` | 文献发现（分栏布局） |
| `src/views/CitationNetwork.vue` | 引用网络（分栏布局+画布背景） |
| `src/views/Settings.vue` | 设置（分 section 卡片+装饰分隔线） |
| `src/assets/textures/rice-paper.png` | 宣纸纹理资源 |

---

### Task 1: 设计系统核心 — main.css Token 升级

**Files:**
- Modify: `src/styles/main.css`

- [ ] **Step 1: 升级色彩 token**

在 `:root` 中添加 5 级墨色系统，调整语义色，添加暖色边框 token：

```css
:root {
  /* --- 色彩系统 --- */
  --bg: #F7F4EE;
  --bg-card: #FFFDF9;
  --bg-elevated: #FFFFFF;

  --sidebar-bg: #2C2A26;
  --sidebar-text: #D4CFC6;
  --sidebar-text-muted: #9A9590;
  --sidebar-hover: rgba(255, 255, 255, 0.06);
  --sidebar-active-bg: rgba(91, 127, 110, 0.15);

  --accent: #5B7F6E;
  --accent-hover: #4A6B5C;
  --accent-light: #E8F0EB;
  --accent-text: #3D5A4E;

  /* 5 级墨色 */
  --ink-dense: #2A2622;
  --ink-secondary: #4A433C;
  --ink-caption: #6B6158;
  --ink-faint: #8F867B;
  --ink-ghost: #B8B0A3;

  --text: var(--ink-dense);
  --text-secondary: var(--ink-caption);
  --text-muted: var(--ink-faint);

  --border: #D8CFBE;
  --border-light: #E8E2D8;
  --shadow-sm: 0 1px 3px rgba(44, 42, 38, 0.04);
  --shadow: 0 2px 8px rgba(44, 42, 38, 0.06);
  --shadow-md: 0 6px 20px rgba(44, 42, 38, 0.1);
  --shadow-lg: 0 12px 40px rgba(44, 42, 38, 0.14);

  --danger: #8B2C1F;
  --danger-light: #FDF0ED;
  --success: #4A6B4A;
  --warning: #C49B4A;

  /* --- 字体 --- */
  --font-ui: "DM Sans", "Microsoft YaHei", "PingFang SC", sans-serif;
  --font-serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif;
  --font-mono: "JetBrains Mono", "Fira Code", "SFMono-Regular", monospace;

  /* --- 间距 --- */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;

  /* --- 圆角 --- */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-card: 10px;

  /* --- 动画 --- */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --duration-instant: 0.1s;
  --duration-fast: 0.15s;
  --duration-slow: 0.25s;
}
```

- [ ] **Step 2: 替换整个 main.css**

用以下完整内容替换 `src/styles/main.css`：

```css
/* ============================================
   文答 Wonder — 暖纸学术风设计系统 v2
   ============================================ */

@keyframes wonder-fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes wonder-scale-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes wonder-spin {
  to { transform: rotate(360deg); }
}

@keyframes wonder-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes wonder-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes wonder-slide-left {
  from { opacity: 0; transform: translateX(-20px) scale(0.97); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}

:root {
  /* --- 色彩系统 --- */
  --bg: #F7F4EE;
  --bg-card: #FFFDF9;
  --bg-elevated: #FFFFFF;

  --sidebar-bg: #2C2A26;
  --sidebar-text: #D4CFC6;
  --sidebar-text-muted: #9A9590;
  --sidebar-hover: rgba(255, 255, 255, 0.06);
  --sidebar-active-bg: rgba(91, 127, 110, 0.15);

  --accent: #5B7F6E;
  --accent-hover: #4A6B5C;
  --accent-light: #E8F0EB;
  --accent-text: #3D5A4E;

  /* 5 级墨色 */
  --ink-dense: #2A2622;
  --ink-secondary: #4A433C;
  --ink-caption: #6B6158;
  --ink-faint: #8F867B;
  --ink-ghost: #B8B0A3;

  --text: var(--ink-dense);
  --text-secondary: var(--ink-caption);
  --text-muted: var(--ink-faint);

  --border: #D8CFBE;
  --border-light: #E8E2D8;
  --shadow-sm: 0 1px 3px rgba(44, 42, 38, 0.04);
  --shadow: 0 2px 8px rgba(44, 42, 38, 0.06);
  --shadow-md: 0 6px 20px rgba(44, 42, 38, 0.1);
  --shadow-lg: 0 12px 40px rgba(44, 42, 38, 0.14);

  --danger: #8B2C1F;
  --danger-light: #FDF0ED;
  --success: #4A6B4A;
  --warning: #C49B4A;

  /* --- 字体 --- */
  --font-ui: "DM Sans", "Microsoft YaHei", "PingFang SC", sans-serif;
  --font-serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif;
  --font-mono: "JetBrains Mono", "Fira Code", "SFMono-Regular", monospace;

  /* --- 间距 --- */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;

  /* --- 圆角 --- */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-card: 10px;

  /* --- 动画 --- */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --duration-instant: 0.1s;
  --duration-fast: 0.15s;
  --duration-slow: 0.25s;
}

/* --- 全局重置 --- */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 960px;
  background: var(--bg);
  background-image: url('@/assets/textures/rice-paper.png');
  background-size: 160px;
  background-blend-mode: lighten;
  background-attachment: fixed;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

/* --- 选中色 --- */
::selection {
  background: var(--accent-light);
  color: var(--accent-text);
}

/* --- 滚动条 --- */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(122, 117, 107, 0.2);
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(122, 117, 107, 0.35);
}

/* --- 焦点 --- */
:focus:not(:focus-visible) {
  outline: none;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* --- 用户选择 --- */
button, nav, aside, .el-table, .el-tabs__header {
  user-select: none;
}

/* --- 页面标题通用样式 --- */
.page-header {
  margin-bottom: var(--space-lg);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
}

.page-header h2 {
  margin: 0 0 6px;
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  color: var(--ink-dense);
  letter-spacing: 0.02em;
}

.page-header p {
  margin: 0;
  color: var(--ink-caption);
  font-size: 13px;
}

/* --- 卡片通用样式 --- */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
}

/* --- 页面内容包装 --- */
.page-content {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
}

/* --- 间距工具类 --- */
.mt-4 { margin-top: var(--space-md); }
.mb-4 { margin-bottom: var(--space-md); }

/* --- 入场动画 --- */
.animate-in {
  animation: wonder-fade-up 0.2s var(--ease-out) both;
}

/* --- 路由过渡 --- */
.wonder-fade-enter-active {
  transition: opacity 0.2s var(--ease-out), transform 0.2s var(--ease-out);
}

.wonder-fade-leave-active {
  transition: opacity 0.1s var(--ease-in);
}

.wonder-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.wonder-fade-leave-to {
  opacity: 0;
}

/* --- 减弱动效 --- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* ============================================
   Element Plus 主题覆盖
   ============================================ */

/* 按钮 */
.el-button--primary {
  --el-button-bg-color: var(--accent) !important;
  --el-button-border-color: var(--accent) !important;
  --el-button-hover-bg-color: var(--accent-hover) !important;
  --el-button-hover-border-color: var(--accent-hover) !important;
  --el-button-active-bg-color: var(--accent-hover) !important;
  --el-button-active-border-color: var(--el-button-active-bg-color) !important;
  font-family: var(--font-ui) !important;
  border-radius: var(--radius-sm) !important;
  font-weight: 500 !important;
  box-shadow: 0 2px 6px rgba(91, 127, 110, 0.3) !important;
  transition: all var(--duration-fast) var(--ease-standard) !important;
}

.el-button--primary:hover {
  filter: brightness(1.08) !important;
  box-shadow: 0 4px 12px rgba(91, 127, 110, 0.35) !important;
}

.el-button--primary:active {
  transform: scale(0.98) !important;
}

.el-button--default {
  font-family: var(--font-ui) !important;
  border-radius: var(--radius-sm) !important;
  border-color: var(--border) !important;
  color: var(--ink-caption) !important;
}

.el-button--default:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

/* 输入框 */
.el-input__wrapper,
.el-textarea__inner {
  border-radius: var(--radius-sm) !important;
  font-family: var(--font-ui) !important;
  background: var(--bg-card) !important;
  box-shadow: 0 0 0 1px var(--border) inset !important;
  transition: box-shadow var(--duration-fast) var(--ease-standard) !important;
}

.el-input__wrapper:hover,
.el-textarea__inner:hover {
  box-shadow: 0 0 0 1px var(--ink-faint) inset !important;
}

.el-input__wrapper.is-focus,
.el-textarea__inner:focus {
  box-shadow: 0 0 0 1px var(--accent) inset, 0 0 0 2px rgba(91, 127, 110, 0.12) !important;
}

.el-input__inner::placeholder {
  color: var(--ink-ghost) !important;
}

/* 选择器 */
.el-select__wrapper {
  border-radius: var(--radius-sm) !important;
  font-family: var(--font-ui) !important;
}

/* 表格 */
.el-table {
  --el-table-border-color: var(--border-light) !important;
  --el-table-header-bg-color: transparent !important;
  --el-table-row-hover-bg-color: var(--accent-light) !important;
  --el-table-tr-bg-color: transparent !important;
  font-family: var(--font-ui) !important;
}

.el-table th.el-table__cell {
  font-weight: 600 !important;
  color: var(--ink-caption) !important;
  font-size: 12px !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* 标签页 */
.el-tabs__item {
  font-family: var(--font-ui) !important;
  color: var(--ink-caption) !important;
  font-weight: 500 !important;
}

.el-tabs__item.is-active {
  color: var(--accent) !important;
  font-weight: 600 !important;
}

.el-tabs__active-bar {
  background-color: var(--accent) !important;
  border-radius: 1px !important;
}

/* 表单 */
.el-form-item__label {
  font-family: var(--font-ui) !important;
  color: var(--ink-secondary) !important;
  font-weight: 600 !important;
  font-size: 13px !important;
}

/* 空状态 */
.el-empty__description p {
  color: var(--ink-faint) !important;
}

/* 消息/警告 */
.el-alert {
  border-radius: var(--radius-md) !important;
}

/* 下拉菜单 */
.el-select-dropdown {
  border-radius: var(--radius-md) !important;
  border: 1px solid var(--border) !important;
  box-shadow: var(--shadow-md) !important;
}

/* 对话框 */
.el-dialog {
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

/* 标签 */
.el-tag {
  border-radius: 4px !important;
  font-family: var(--font-ui) !important;
}
```

- [ ] **Step 3: 验证构建**

```bash
cd E:/.code/My/note-forge && npm run build 2>&1 | tail -5
```

Expected: 构建成功（可能有纹理图片路径警告，Task 2 处理）

- [ ] **Step 4: Commit**

```bash
cd E:/.code/My/note-forge && git add src/styles/main.css && git commit -m "feat: upgrade design system — 5-tier ink, warm border, animation tokens"
```

---

### Task 2: 宣纸纹理资源

**Files:**
- Create: `src/assets/textures/rice-paper.png`

- [ ] **Step 1: 生成宣纸纹理**

用 CSS 生成一个等效的纹理图片。创建一个临时 HTML 文件来生成，或者直接用 SVG fractalNoise 作为内联纹理：

在 `src/styles/main.css` 的 `body` 规则中，将 `background-image` 改为内联 SVG 纹理（避免外部图片依赖）：

```css
body {
  margin: 0;
  min-width: 960px;
  background-color: var(--bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 2: 验证构建**

```bash
cd E:/.code/My/note-forge && npm run build 2>&1 | tail -5
```

Expected: 构建成功，无纹理路径错误

- [ ] **Step 3: Commit**

```bash
cd E:/.code/My/note-forge && git add src/styles/main.css && git commit -m "feat: add rice paper texture via inline SVG"
```

---

### Task 3: 侧栏品牌区 + 导航升级

**Files:**
- Modify: `src/components/AppLayout.vue`

- [ ] **Step 1: 重写 AppLayout.vue**

用以下内容完整替换 `src/components/AppLayout.vue`：

```vue
<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="brand">
        <img src="/patternLogo.png" alt="文答" class="brand-logo" />
        <div class="brand-text">
          <h1>文答</h1>
          <p>Wonder · Research Desk</p>
        </div>
      </div>

      <nav class="nav-main">
        <div class="nav-group">
          <div class="nav-group-title">分析</div>
          <RouterLink to="/" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h4"/></svg>
            </span>
            <span class="nav-label">单篇分析</span>
          </RouterLink>
          <RouterLink to="/batch" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>
            </span>
            <span class="nav-label">批量矩阵</span>
          </RouterLink>
        </div>

        <div class="nav-group">
          <div class="nav-group-title">工具</div>
          <RouterLink to="/discovery" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="9" r="5.5"/><path d="M13.5 13.5L17 17"/></svg>
            </span>
            <span class="nav-label">文献发现</span>
          </RouterLink>
          <RouterLink to="/citation" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="5" r="2.5"/><circle cx="5" cy="14" r="2.5"/><circle cx="15" cy="14" r="2.5"/><path d="M8.5 7L6.5 11.5M11.5 7l2 4.5"/></svg>
            </span>
            <span class="nav-label">引用网络</span>
          </RouterLink>
        </div>

        <div class="nav-group">
          <div class="nav-group-title">记录</div>
          <RouterLink to="/history" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>
            </span>
            <span class="nav-label">历史记录</span>
          </RouterLink>
          <RouterLink to="/qa" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h12a2 2 0 012 2v7a2 2 0 01-2 2H7l-4 3V6a2 2 0 012-2z"/><path d="M7 9h6M7 12h3"/></svg>
            </span>
            <span class="nav-label">追溯问答</span>
          </RouterLink>
        </div>
      </nav>

      <div class="nav-divider"></div>

      <nav class="nav-footer">
        <RouterLink to="/settings" class="nav-item">
          <span class="nav-icon">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4"/></svg>
          </span>
          <span class="nav-label">设置</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: 232px 1fr;
  min-height: 100vh;
}

/* --- 侧栏 --- */
.sidebar {
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 宣纸纹理 */
.sidebar::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  pointer-events: none;
}

/* --- 品牌区 --- */
.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 4px 8px 20px;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 16px;
}

.brand-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 10px;
  opacity: 0.9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.brand-text h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: #F0ECE4;
  letter-spacing: 0.04em;
}

.brand-text p {
  margin: 2px 0 0;
  color: var(--sidebar-text-muted);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* --- 导航 --- */
.nav-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-group {
  margin-bottom: 4px;
}

.nav-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--sidebar-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 8px 12px 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  position: relative;
  transition:
    background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.nav-item:hover {
  background: var(--sidebar-hover);
  color: #F0ECE4;
}

.nav-item.router-link-active {
  background: var(--sidebar-active-bg);
  color: var(--accent);
}

.nav-item.router-link-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon svg {
  width: 18px;
  height: 18px;
}

.nav-label {
  white-space: nowrap;
}

/* --- 分隔线 --- */
.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 12px 8px;
}

/* --- 底部导航 --- */
.nav-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* --- 内容区 --- */
.content {
  min-width: 0;
  padding: 32px 36px;
  background: var(--bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  overflow-y: auto;
}
</style>
```

- [ ] **Step 2: 验证构建**

```bash
cd E:/.code/My/note-forge && npm run build 2>&1 | tail -5
```

Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
cd E:/.code/My/note-forge && git add src/components/AppLayout.vue && git commit -m "feat: redesign sidebar — grouped nav, larger brand, rice paper texture"
```

---

### Task 4: App.vue 路由过渡

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 添加 Transition 包裹**

```vue
<template>
  <Transition name="wonder-fade" mode="out-in">
    <RouterView />
  </Transition>
</template>
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/App.vue && git commit -m "feat: add route transition animation"
```

---

### Task 5: Home.vue 样式升级

**Files:**
- Modify: `src/views/Home.vue`

- [ ] **Step 1: 替换 style 部分**

将 `<style scoped>` 部分替换为：

```css
<style scoped>
.upload-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.analyze-btn {
  align-self: flex-end;
  min-width: 160px;
}

.stream-card {
  margin-top: var(--space-md);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.1s;
}

.stream-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.stream-box :deep(.el-textarea__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-caption);
  padding: 0;
  resize: none;
}

.mt-4 {
  margin-top: var(--space-md);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/views/Home.vue && git commit -m "feat: upgrade Home page styles with animation and warm tokens"
```

---

### Task 6: Batch.vue 样式升级

**Files:**
- Modify: `src/views/Batch.vue`

- [ ] **Step 1: 替换 style 部分**

将 `<style scoped>` 部分替换为：

```css
<style scoped>
.upload-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.file-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 120px;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard);
}

.file-picker:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}

.picker-icon {
  width: 36px;
  height: 36px;
  color: var(--ink-faint);
}

.picker-icon svg {
  width: 100%;
  height: 100%;
}

.picker-hint {
  margin: 0;
  color: var(--ink-faint);
  font-size: 13px;
}

.file-list {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
}

.file-name {
  font-size: 13px;
  color: var(--ink-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  margin-top: var(--space-md);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.run-btn {
  min-width: 160px;
}

.stream-card {
  margin-top: var(--space-md);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 12px 16px;
}

.stream-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}

.stream-box :deep(.el-textarea__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-caption);
  padding: 0;
  resize: none;
}

.mt-4 {
  margin-top: var(--space-md);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/views/Batch.vue && git commit -m "feat: upgrade Batch page styles with warm tokens"
```

---

### Task 7: QA.vue 样式升级

**Files:**
- Modify: `src/views/QA.vue`

- [ ] **Step 1: 替换 style 部分**

```css
<style scoped>
.qa-page {
  height: calc(100vh - 64px);
}

.context-bar {
  display: flex;
  gap: 12px;
  margin-bottom: var(--space-md);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.05s;
}

.record-select {
  flex: 1;
}

.session-select {
  width: 220px;
}

.chat-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.1s;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--ink-faint);
  font-size: 14px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--border);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.input-bar {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-card);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/views/QA.vue && git commit -m "feat: upgrade QA page styles with warm tokens"
```

---

### Task 8: History.vue — 表格升级为卡片列表

**Files:**
- Modify: `src/views/History.vue`

- [ ] **Step 1: 重写 template 和 style**

将 template 中的 `<el-table>` 替换为卡片列表，重写 style：

```vue
<template>
  <AppLayout>
    <div class="page-content">
      <section class="page-header">
        <h2>历史记录</h2>
        <p>查看和管理已分析的文献记录。</p>
      </section>

      <div v-if="records.length" class="history-list">
        <div
          v-for="(record, idx) in records"
          :key="record.id"
          class="history-card"
          :style="{ '--i': Math.min(idx, 5) }"
        >
          <div class="history-card-body" @click="$router.push(`/history/${record.id}`)">
            <div class="history-card-title">{{ record.fileName }}</div>
            <div class="history-card-meta">
              <span class="model-tag">{{ record.model }}</span>
              <span class="time-cell">{{ record.createdAt }}</span>
            </div>
          </div>
          <div class="history-card-actions">
            <el-button text type="danger" size="small" @click.stop="remove(record.id)">删除</el-button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="20" cy="20" r="14"/><path d="M20 12v8l5 3"/></svg>
        </div>
        <span>暂无分析记录</span>
      </div>
    </div>
  </AppLayout>
</template>
```

style 替换为：

```css
<style scoped>
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: calc(var(--i) * 0.05s);
}

.history-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.history-card-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.history-card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-secondary);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-card-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.model-tag {
  font-size: 11px;
  color: var(--ink-faint);
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 4px;
}

.time-cell {
  font-size: 12px;
  color: var(--ink-ghost);
}

.history-card-actions {
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-standard);
}

.history-card:hover .history-card-actions {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  gap: 12px;
  color: var(--ink-faint);
  font-size: 14px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--border);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/views/History.vue && git commit -m "feat: redesign History as card list with hover effects"
```

---

### Task 9: HistoryDetail.vue 样式微调

**Files:**
- Modify: `src/views/HistoryDetail.vue`

- [ ] **Step 1: 更新 style**

```css
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
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/views/HistoryDetail.vue && git commit -m "feat: upgrade HistoryDetail card style"
```

---

### Task 10: Settings.vue 样式升级

**Files:**
- Modify: `src/views/Settings.vue`

- [ ] **Step 1: 替换 style**

```css
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
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/views/Settings.vue && git commit -m "feat: upgrade Settings with decorative section dividers"
```

---

### Task 11: Discovery.vue 分栏布局

**Files:**
- Modify: `src/views/Discovery.vue`

- [ ] **Step 1: 重写 template 和 style**

template 替换为分栏布局：

```vue
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
```

style 替换为：

```css
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
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/views/Discovery.vue && git commit -m "feat: redesign Discovery with split-panel layout"
```

---

### Task 12: CitationNetwork.vue 样式升级

**Files:**
- Modify: `src/views/CitationNetwork.vue`

- [ ] **Step 1: 替换 style 部分**

```css
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
```

- [ ] **Step 2: Commit**

```bash
cd E:/.code/My/note-forge && git add src/views/CitationNetwork.vue && git commit -m "feat: upgrade CitationNetwork styles with warm tokens"
```

---

### Task 13: 通用组件样式升级

**Files:**
- Modify: `src/components/FileUpload.vue`
- Modify: `src/components/ChatMessage.vue`
- Modify: `src/components/ExportButtons.vue`

- [ ] **Step 1: FileUpload.vue — 替换 style**

```css
<style scoped>
.file-picker {
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--bg);
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard);
  cursor: pointer;
}

.file-picker:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}

.picker-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
}

.picker-icon {
  width: 36px;
  height: 36px;
  color: var(--ink-ghost);
  transition: color var(--duration-fast) var(--ease-standard);
}

.file-picker:hover .picker-icon {
  color: var(--accent);
}

.picker-icon svg {
  width: 100%;
  height: 100%;
}

.picker-hint {
  margin: 0;
  color: var(--ink-faint);
  font-size: 12px;
}

.file-selected {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 2: ChatMessage.vue — 替换 style**

```css
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
```

- [ ] **Step 3: ExportButtons.vue — 替换 style**

```css
<style scoped>
.export-bar {
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
}

.btn-icon svg {
  width: 100%;
  height: 100%;
}
</style>
```

- [ ] **Step 4: Commit**

```bash
cd E:/.code/My/note-forge && git add src/components/FileUpload.vue src/components/ChatMessage.vue src/components/ExportButtons.vue && git commit -m "feat: upgrade FileUpload, ChatMessage, ExportButtons styles"
```

---

### Task 14: WorkflowStatus 组件升级

**Files:**
- Modify: `src/components/WorkflowStatus.vue`
- Modify: `src/components/BatchWorkflowStatus.vue`

- [ ] **Step 1: WorkflowStatus.vue — 替换 style**

```css
<style scoped>
.workflow {
  display: flex;
  align-items: center;
  gap: 0;
  margin: var(--space-md) 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  flex: 1;
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
  color: var(--ink-faint);
  font-size: 11px;
}

.step-dot svg {
  width: 14px;
  height: 14px;
}

.step-num {
  font-weight: 600;
  font-size: 11px;
}

.step-label {
  font-size: 12px;
  color: var(--ink-faint);
  font-weight: 500;
  white-space: nowrap;
  transition: color var(--duration-fast) var(--ease-standard);
}

.step-connector {
  flex: 1;
  height: 1.5px;
  background: var(--border);
  margin: 0 8px;
  transition: background var(--duration-fast) var(--ease-standard);
}

.step-connector.filled {
  background: var(--accent);
}

.step.active .step-dot {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  animation: wonder-pulse 2s ease-in-out infinite;
}

.step.active .step-label {
  color: var(--accent);
  font-weight: 600;
}

.step.done .step-dot {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
}

.step.done .step-label {
  color: var(--ink-caption);
}
</style>
```

- [ ] **Step 2: BatchWorkflowStatus.vue — 替换 style（同上风格）**

```css
<style scoped>
.workflow {
  display: flex;
  align-items: center;
  gap: 0;
  margin: var(--space-md) 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  flex: 1;
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
  color: var(--ink-faint);
  font-size: 11px;
}

.step-dot svg {
  width: 14px;
  height: 14px;
}

.step-num {
  font-weight: 600;
  font-size: 11px;
}

.step-label {
  font-size: 12px;
  color: var(--ink-faint);
  font-weight: 500;
  white-space: nowrap;
  transition: color var(--duration-fast) var(--ease-standard);
}

.step-connector {
  flex: 1;
  height: 1.5px;
  background: var(--border);
  margin: 0 8px;
  transition: background var(--duration-fast) var(--ease-standard);
}

.step-connector.filled {
  background: var(--accent);
}

.step.active .step-dot {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  animation: wonder-pulse 2s ease-in-out infinite;
}

.step.active .step-label {
  color: var(--accent);
  font-weight: 600;
}

.step.done .step-dot {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
}

.step.done .step-label {
  color: var(--ink-caption);
}

.file-hint {
  margin: 0 0 var(--space-md);
  color: var(--ink-caption);
  font-size: 13px;
  padding-left: 4px;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
cd E:/.code/My/note-forge && git add src/components/WorkflowStatus.vue src/components/BatchWorkflowStatus.vue && git commit -m "feat: upgrade WorkflowStatus with breathing pulse and warm tokens"
```

---

### Task 15: AnalysisResult + BatchResult 样式微调

**Files:**
- Modify: `src/components/AnalysisResult.vue`
- Modify: `src/components/BatchResult.vue`

- [ ] **Step 1: AnalysisResult.vue — 替换 style**

```css
<style scoped>
.result-container {
  margin-top: var(--space-lg);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.15s;
}

.result-tabs {
  --el-tabs-header-height: 44px;
}

.result-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 8px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}

.result-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.result-tabs :deep(.el-tabs__content) {
  padding: 0;
}

.result-tabs :deep(.el-tab-pane) {
  padding: 0;
}

article {
  line-height: 1.8;
  padding: 24px 28px;
  font-family: var(--font-serif);
  color: var(--ink-secondary);
  font-size: 14.5px;
}

article :deep(h1) {
  font-size: 22px;
  margin: 0 0 16px;
  font-family: var(--font-serif);
  color: var(--ink-dense);
}

article :deep(h2) {
  font-size: 18px;
  margin: 20px 0 12px;
  font-family: var(--font-serif);
  color: var(--ink-dense);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 8px;
}

article :deep(h3) {
  font-size: 16px;
  margin: 16px 0 8px;
  font-family: var(--font-serif);
  color: var(--ink-dense);
}

article :deep(p) {
  margin: 0 0 10px;
}

article :deep(code) {
  font-family: var(--font-mono);
  background: var(--bg);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.88em;
}

article :deep(pre) {
  background: var(--bg);
  padding: 16px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  border: 1px solid var(--border-light);
  margin: 12px 0;
}

article :deep(pre code) {
  background: none;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 13px;
}

article :deep(blockquote) {
  border-left: 3px solid var(--accent);
  margin: 12px 0;
  padding: 10px 16px;
  color: var(--ink-caption);
  background: var(--accent-light);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

article :deep(ul),
article :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

article :deep(li) {
  margin: 4px 0;
}

article :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

article :deep(th),
article :deep(td) {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}

article :deep(th) {
  background: var(--bg);
  font-weight: 600;
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--ink-caption);
}

article :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 20px 0;
}

.export-bar {
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 8px;
}
</style>
```

- [ ] **Step 2: BatchResult.vue — 替换 style**

```css
<style scoped>
.result-tabs {
  margin-top: 22px;
  animation: wonder-fade-up 0.2s var(--ease-out) both;
  animation-delay: 0.15s;
}

article {
  line-height: 1.8;
  padding: 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  font-family: var(--font-serif);
  color: var(--ink-secondary);
}

article :deep(h1),
article :deep(h2),
article :deep(h3) {
  font-family: var(--font-serif);
  color: var(--ink-dense);
}

article :deep(code) {
  font-family: var(--font-mono);
  background: var(--bg);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.9em;
}

article :deep(pre) {
  background: var(--bg);
  padding: 14px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  border: 1px solid var(--border-light);
}

article :deep(pre code) {
  background: none;
  padding: 0;
}
</style>
```

- [ ] **Step 3: Commit**

```bash
cd E:/.code/My/note-forge && git add src/components/AnalysisResult.vue src/components/BatchResult.vue && git commit -m "feat: upgrade AnalysisResult and BatchResult with warm tokens"
```

---

### Task 16: 最终验证

- [ ] **Step 1: 构建验证**

```bash
cd E:/.code/My/note-forge && npm run build 2>&1 | tail -10
```

Expected: 构建成功，无错误

- [ ] **Step 2: 类型检查**

```bash
cd E:/.code/My/note-forge && npx vue-tsc --noEmit 2>&1 | tail -10
```

Expected: 无类型错误

- [ ] **Step 3: 最终 Commit（如有遗漏）**

```bash
cd E:/.code/My/note-forge && git status
```

检查是否有未提交的改动。
