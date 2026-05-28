# 文答 前端全面翻新设计文档

**日期:** 2026-05-28
**状态:** 已批准
**范围:** 前端视觉与交互全面升级，不涉及后端逻辑、stores、lib/、router 路由定义、API 接口
**参考:** OpenHanako warm-paper 主题

---

## 1. 设计目标

将"文答"从个人项目感提升为可公开发布的专业产品。在现有"暖纸学术风"基础上全面强化，参考 OpenHanako 的宣纸纹理、5 级墨色系统、集中式动画系统等设计语言。

**核心决策：**
- 视觉风格：暖纸学术风（强化现有）
- 侧栏：深色质感侧栏 + 分组导航 + 品牌区升级
- 主题：仅浅色主题
- 内容布局：混合布局（单列居中 + 左右分栏）
- 动效：精致克制（wonder-* 动画系统）
- 背景：宣纸纹理叠加

---

## 2. 模块 1：设计系统重构

**文件:** `src/styles/main.css`

### 2.1 色彩系统升级

保留现有暖色调基础色（`--bg`, `--bg-card`, `--sidebar-bg`, `--accent`），扩展文字层级为 5 级墨色系统：

```
--ink-dense: #2A2622      /* 浓墨 — 标题、重要文字 */
--ink-secondary: #4A433C  /* 二级墨 — 正文 */
--ink-caption: #6B6158    /* 说明文字 */
--ink-faint: #8F867B      /* 辅助文字 */
--ink-ghost: #B8B0A3      /* 最淡 — placeholder、禁用 */
```

语义色调整：
- `--danger: #8B2C1F`（朱砂红，替换原 `#C45B4A`）
- `--success: #4A6B4A`（墨绿，替换原 `#5B7F6E` 用于成功状态，强调色保持不变）

### 2.2 宣纸纹理系统

资源：一张 160x160px 宣纸纹理 PNG（~100KB），放在 `src/assets/textures/rice-paper.png`。使用 OpenHanako 项目的 `rice-paper.png` 纹理或自行生成等效的 fractalNoise 纹理图片。

应用层级：
- **内容区** — `background: var(--bg) url(rice-paper.png); background-size: 160px; background-blend-mode: lighten; background-attachment: fixed;`
- **侧栏** — 同纹理，`opacity: 0.06`，替换现有 SVG fractalNoise
- **卡片** — 同纹理，`blend-mode: lighten`，亮度补偿层 `rgba(255,253,247,0.35)` 通过 `::before` 伪元素实现

### 2.3 动画系统

集中式命名 `wonder-*`，定义在 main.css 底部。

时长 Token：
```
--duration-instant: 0.1s
--duration-fast: 0.15s
--duration-slow: 0.25s
```

缓动曲线：
```
--ease-out: cubic-bezier(0.16, 1, 0.3, 1)
--ease-in: cubic-bezier(0.7, 0, 0.84, 0)
--ease-standard: cubic-bezier(0.2, 0, 0, 1)
```

Keyframes：
```
wonder-fade-up    — opacity + translateY(6px→0)
wonder-scale-in   — opacity + scale(0.96→1) + translateY(8px→0)
wonder-spin       — 360° 旋转（loading）
wonder-pulse      — 呼吸光点（opacity 0.4→1→0.4）
wonder-fade       — 纯 opacity 过渡
wonder-slide-left — translateX(-20px→0) + scale(0.97→1)
```

### 2.4 圆角与阴影

圆角微调（更精致）：
```
--radius-sm: 4px   (原 6px)
--radius-md: 8px   (原 10px)
--radius-lg: 12px  (原 14px)
--radius-card: 10px (新增，卡片专用)
```

阴影多层化：
```
--shadow-sm: 0 1px 3px rgba(44,42,38,0.04)
--shadow: 0 2px 8px rgba(44,42,38,0.06)
--shadow-md: 0 6px 20px rgba(44,42,38,0.1)
--shadow-lg: 0 12px 40px rgba(44,42,38,0.14)
```

### 2.5 字体

保持现有三族不变。字体加载策略：通过 Google Fonts CDN 在 `index.html` 中引入 DM Sans（400/500/600/700）和 JetBrains Mono（400），作为 CSS fallback 的增强层。不自托管 woff2（增加构建复杂度，CDN 对桌面应用足够）。

---

## 3. 模块 2：侧栏品牌区 + 导航升级

**文件:** `src/components/AppLayout.vue`

### 3.1 品牌区

- Logo 从 36px → 44px，圆角 10px
- 标题用衬线字体（`--font-serif`），20px，`letter-spacing: 0.04em`
- 副标题大写，`letter-spacing: 0.08em`
- 品牌区底部增加装饰分隔线（1px `rgba(255,255,255,0.06)`）

### 3.2 导航分组

三组：
- **分析** — 单篇分析、批量矩阵
- **工具** — 文献发现、引用网络
- **记录** — 历史记录、追溯问答

分组标题：小号（11px）大写字母，`--sidebar-text-muted` 色，`font-weight: 600`

### 3.3 交互状态

- **Active** — 左侧 3px 竖线（强调色）+ `rgba(91,127,110,0.15)` 背景 + 文字变强调色
- **Hover** — 背景色渐变 0.15s（`--sidebar-hover`），文字微亮
- 设置项用分隔线与主导航隔开

### 3.4 纹理

SVG fractalNoise 替换为宣纸纹理，opacity 0.06

---

## 4. 模块 3：页面组件翻新

**文件:** 所有 `src/views/*.vue`

### 4.1 通用页面头部

- 标题：`--ink-dense` 浓墨色 + 衬线字体 24px `font-weight: 700`
- 副标题：`--ink-caption` 13px
- 页面内容区统一入场动画 `wonder-fade-up 0.2s var(--ease-out)`

### 4.2 卡片升级

- 圆角：14px → 10px（`--radius-card`）
- 边框色：`--border` → `#D8CFBE`（更暖）
- 阴影：`--shadow` 多层
- 背景叠加宣纸纹理 + 亮度补偿

### 4.3 Home（单篇分析）

- 拖拽区增加图标 + 双行文字（主提示 + 格式说明）
- 拖拽 hover 状态：虚线框变强调色实线 + 背景变 `--accent-light`
- 按钮增加微阴影 `0 2px 6px rgba(91,127,110,0.3)`

### 4.4 QA（追溯问答）

- 用户气泡：强调色背景 + 微阴影
- AI 气泡：卡片背景 + 宣纸纹理 + 左侧 2px 强调色竖线 + 衬线字体
- 新消息入场 `wonder-fade-up`

### 4.5 History（历史记录）

- 从表格升级为卡片列表
- hover 微上浮 `translateY(-2px)` + 阴影加深
- 操作按钮默认隐藏，hover 时 fade-in

### 4.6 Settings

- 每个 section（模型配置、研究偏好）用独立卡片包裹，卡片间间距 16px
- Section 标题用 `--ink-dense` + 14px + `font-weight: 600`
- Section 之间用装饰分隔线（居中短线 + 两侧留白，参考 OpenHanako Jian 笔记头部样式）

---

## 5. 模块 4：Discovery / Citation 分栏布局

**文件:** `src/views/Discovery.vue`, `src/views/CitationNetwork.vue`

### 5.1 Discovery 分栏

- 左栏：搜索框 + 结果列表（340px）
- 右栏：论文详情面板（flex）
- 列表项：卡片样式，左侧 3px 强调色竖线标识选中
- 详情面板：论文标题 + 作者 + 指标卡片（引用数/影响力/年份）+ 摘要 + 操作按钮

### 5.2 Citation Network 分栏

- 左栏 300px：种子论文输入 + 已加载论文列表
- 右栏：Canvas 引用图（保持现有实现）
- 底部面板：点击节点后展开论文详情（可收起）
- 画布背景：浅暖纸色 + 微点阵网格线

### 5.3 响应式

- ≥1200px — 左栏 340px + 右栏 flex
- 960-1199px — 左栏 280px + 右栏 flex
- 详情面板可折叠

---

## 6. 模块 5：通用组件打磨

**文件:** `src/components/*.vue`

### 6.1 FileUpload

- 拖拽区增加图标 + 双行提示
- 拖拽 hover：虚线框变强调色实线 + `--accent-light` 背景
- 已选文件：文件名 + 类型图标 + 清除按钮

### 6.2 ChatMessage

- 用户气泡：微阴影 `0 2px 6px rgba(91,127,110,0.2)`
- AI 气泡：左侧 2px 强调色竖线 + 阴影 + 衬线字体 15px

### 6.3 WorkflowStatus

- 步骤圆点：未开始空心灰圈、进行中强调色 + `wonder-pulse` 呼吸光点、完成实心 + 勾号
- 连接线：未到达灰色虚线、已完成强调色实线
- 卡片化包装 + 宣纸纹理

### 6.4 ExportButtons

- 按钮带图标，ghost 变体 + hover 边框渐变
- 成功反馈：按钮文字变 "✓ 已导出" 2 秒后恢复

---

## 7. 模块 6：Element Plus 深度覆盖

**文件:** `src/styles/main.css`

### 7.1 按钮

- 主按钮：微阴影 `0 2px 6px rgba(91,127,110,0.3)`
- hover：`brightness(1.08)` + 阴影加深
- active：`scale(0.98)` 微按压感
- focus-visible：2px 强调色 ring + 2px offset

### 7.2 输入框 / 选择器

- 边框色：`#D8CFBE`（暖灰）
- hover：边框变 `--ink-caption`
- focus：边框变强调色 + `box-shadow: 0 0 0 2px rgba(91,127,110,0.12)`
- placeholder：`--ink-ghost`
- 背景：`--bg-card`

### 7.3 表格

- 表头：无背景色，小号大写字母，`--ink-caption`
- 行：无边框线，hover 时 `--accent-light` 背景
- 取消斑马纹

### 7.4 标签页

- 底部指示条：2px 圆角，强调色
- 非活跃：`--ink-caption`
- 活跃：强调色 + `font-weight: 600`

### 7.5 对话框

- 圆角 12px
- 遮罩：`rgba(44,42,38,0.4)` + `backdrop-filter: blur(4px)`
- 入场：`wonder-scale-in 0.25s var(--ease-out)`
- 标题用衬线字体

### 7.6 标签 / 警告 / 空状态

- Tag：圆角 4px，`--accent-light` 背景，`--accent-text` 文字
- Alert：圆角 8px，左侧 3px 色条
- Empty：大号淡色图标 + 衬线字体 + 引导按钮

---

## 8. 模块 7：入场动画 + 页面过渡

### 8.1 页面入场

- `.page-content` 统一 `wonder-fade-up 0.2s var(--ease-out)`
- 子元素 stagger：`animation-delay: calc(var(--i) * 50ms)`，最大 300ms

### 8.2 路由过渡

- `<Transition name="wonder-fade" mode="out-in">` 包裹 `<RouterView>`
- 离场：opacity 1→0，100ms
- 入场：opacity 0→1 + translateY(4px→0)，200ms
- 侧栏不参与过渡

### 8.3 Loading 状态

- 呼吸光点：`wonder-pulse 2s ease-in-out infinite`，5px 强调色圆点
- 旋转加载：`wonder-spin 0.8s linear infinite`，1em 圆环

### 8.4 无障碍

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. 不改动的部分

- 后端 Rust 代码（`src-tauri/`）
- Pinia stores（`src/stores/`）
- 业务逻辑库（`src/lib/`）
- Router 路由定义（`src/router/index.ts` 中的路径和组件映射）
- API 接口定义
- 组件的 props / emits / 业务逻辑
- Tauri 插件配置

---

## 10. 涉及文件清单

| 文件 | 改动类型 |
|------|----------|
| `src/styles/main.css` | 重构 — token 升级 + 纹理 + 动画系统 + Element Plus 覆盖 |
| `src/components/AppLayout.vue` | 重构 — 品牌区 + 分组导航 + 纹理 |
| `src/components/FileUpload.vue` | 样式升级 |
| `src/components/ChatMessage.vue` | 样式升级 |
| `src/components/WorkflowStatus.vue` | 样式升级 |
| `src/components/BatchWorkflowStatus.vue` | 样式升级 |
| `src/components/ExportButtons.vue` | 样式升级 |
| `src/components/AnalysisResult.vue` | 样式微调 |
| `src/components/BatchResult.vue` | 样式微调 |
| `src/views/Home.vue` | 样式升级 + 入场动画 |
| `src/views/Batch.vue` | 样式升级 |
| `src/views/QA.vue` | 样式升级 |
| `src/views/History.vue` | 样式升级（表格→卡片列表） |
| `src/views/HistoryDetail.vue` | 样式微调 |
| `src/views/Discovery.vue` | 布局重构（分栏） |
| `src/views/CitationNetwork.vue` | 布局重构（分栏） |
| `src/views/Settings.vue` | 样式升级 |
| `src/assets/textures/rice-paper.png` | 新增 — 宣纸纹理资源 |
| `src/App.vue` | 新增 — 路由过渡 `<Transition>` |
| `src/main.ts` | 可能新增 — 字体加载 |
