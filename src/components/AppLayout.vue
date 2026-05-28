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
          <RouterLink to="/knowledge" class="nav-item">
            <span class="nav-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M12 2v4h4"/><path d="M7 10h6M7 13h4"/></svg>
            </span>
            <span class="nav-label">知识库</span>
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
