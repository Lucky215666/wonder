# Splash 加载界面改善设计

日期：2026-06-04

## 问题

1. **无进度反馈** — splash 只有 spinner，用户不知道在等什么（Python 后端最长 30s）
2. **错误时卡死** — 后端启动失败，splash 永远转圈，无提示无重试
3. **中文乱码** — 提示文字 "姝ｅ湪鍚姩锛岃绋嶅€欌€?" 应为 "正在启动，请稍候..."
4. **UI 粗糙** — "W" 是纯文本 32px，窗口 360x200 偏小
5. **过渡闪白** — 用 `did-finish-load` 关闭 splash，主窗口可能闪白

## 方案

### 1. Splash 通信架构

为 splash 窗口创建 preload 脚本，通过 IPC 接收主进程的阶段更新和错误信息。

**新建 `electron/splash-preload.ts`：**
```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('splashAPI', {
  onStage: (cb: (msg: string) => void) => ipcRenderer.on('splash:stage', (_, msg) => cb(msg)),
  onError: (cb: (msg: string) => void) => ipcRenderer.on('splash:error', (_, msg) => cb(msg)),
  retry: () => ipcRenderer.send('splash:retry'),
})
```

**splash 窗口 HTML 中监听：**
```javascript
window.splashAPI.onStage(msg => {
  document.getElementById('stage').textContent = msg
})
window.splashAPI.onError(msg => {
  // 隐藏 spinner，显示错误信息和重试按钮
})
```

### 2. 主进程启动流程重构

将 `createWindow()` 中的启动逻辑提取为 `startApp()` 函数，支持重试。

**启动阶段消息：**
| 阶段 | IPC 消息 | 时机 |
|------|---------|------|
| Python 后端 | "启动 AI 后端..." | `startPythonBackend()` 调用前 |
| Node 服务 | "启动服务..." | `require server` 前 |
| 加载界面 | "加载界面..." | `mainWindow.loadURL()` 前 |

**错误处理：**
- `startPythonBackend()` 超时 → 发送 `splash:error` + 错误信息
- `waitForServer()` 超时 → 发送 `splash:error` + 错误信息
- 错误信息示例："AI 后端启动超时（30s）"、"服务启动超时（15s）"

**重试逻辑：**
- 监听 `splash:retry` IPC 事件
- 清理：kill pythonProcess、释放端口、销毁 mainWindow（如有）
- 重新调用 `startApp()`

### 3. Splash UI

**窗口尺寸：** 400x260（当前 360x200）

**正常状态：**
```html
<div class="icon">W</div>          <!-- 48px，品牌色 #5B7F6E，text-shadow -->
<div class="title">Wonder</div>    <!-- 18px，#2C2C2C -->
<div class="spinner"></div>        <!-- 32px，品牌色 -->
<div class="stage">启动 AI 后端...</div> <!-- 13px，#5B7F6E，动态更新 -->
<div class="hint">正在启动，请稍候</div>  <!-- 12px，#999 -->
```

**错误状态：**
```html
<div class="icon">W</div>
<div class="title">Wonder</div>
<div class="error-icon">✕</div>    <!-- 红色 #D4574E -->
<div class="error-msg">AI 后端启动超时（30s）</div>
<button class="retry-btn" onclick="window.splashAPI.retry()">重试启动</button>
```

**样式保持：**
- 背景：`rgba(250,248,243,0.95)`
- 圆角：`border-radius: 12px`
- 字体：`"Noto Serif SC","Source Han Serif SC","Georgia",serif`
- 品牌色：`#5B7F6E`

**重试按钮样式：**
- 背景：`#5B7F6E`，文字白色
- 圆角：`border-radius: 6px`
- hover：`#4A6B5A`
- padding：`8px 24px`

### 4. 主窗口过渡

将 `did-finish-load` 改为 `ready-to-show`：

```typescript
// Before
mainWindow.webContents.on('did-finish-load', () => { ... })

// After
mainWindow.on('ready-to-show', () => {
  if (splashWindow) {
    splashWindow.close()
    splashWindow = null
  }
  mainWindow.show()
})
```

`ready-to-show` 等待首次非空绘制，避免主窗口闪白。

## 涉及文件

| 文件 | 变更 |
|------|------|
| `electron/main.ts` | 重构启动流程、添加 IPC 通信、改用 ready-to-show |
| `electron/splash-preload.ts` | **新建** — splash 窗口的 preload 脚本 |

## 启动流程（改后）

```
用户双击 exe
  → [1-2s Electron 初始化，不可控]
  → app.on('ready')
  → createSplash() + splash-preload 加载
  → splash 立即显示（W + Wonder + spinner + "正在启动，请稍候"）
  → 发送 "启动 AI 后端..." → splash 更新阶段文字
  → startPythonBackend() 最长 30s
    → 成功：继续
    → 失败：splash 显示错误 + 重试按钮
  → 发送 "启动服务..." → splash 更新阶段文字
  → require server + waitForServer() 最长 15s
    → 成功：继续
    → 失败：splash 显示错误 + 重试按钮
  → 创建主窗口（show: false）
  → 发送 "加载界面..."
  → mainWindow.loadURL()
  → ready-to-show → splash.close() + mainWindow.show()
```

## 不做的事情

- 不替换为内嵌式 loading（用户选择保留独立 splash）
- 不加进度条（后端启动时间不固定，进度不准）
- 不改视觉风格（保持暖色纸张 + 衬线字体）
- 不优化 Electron 初始化时间（1-2s 是 Chromium 固有开销）
