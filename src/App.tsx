import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Tooltip } from 'antd'
import { useUIStore } from './stores/ui'
import { useConfigStore } from './stores/config'
import {
  HomeOutlined,
  HistoryOutlined,
  BookOutlined,
  SearchOutlined,
  SettingOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  ExperimentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined,
  CloseSquareOutlined,
} from '@ant-design/icons'

import Home from './pages/Home'
import Welcome from './pages/Welcome'
import Batch from './pages/Batch'
import QA from './pages/QA'
import Discovery from './pages/Discovery'
import CitationNetwork from './pages/CitationNetwork'
import Knowledge from './pages/Knowledge'
import History from './pages/History'
import HistoryDetail from './pages/HistoryDetail'
import SettingsModal from './components/SettingsModal'

const { Sider, Content } = Layout

const menuItems = [
  { type: 'group' as const, label: <span className="wonder-nav-group">分析</span>, children: [
    { key: '/', icon: <HomeOutlined />, label: '单篇分析' },
    { key: '/batch', icon: <FileTextOutlined />, label: '批量矩阵' },
  ]},
  { type: 'group' as const, label: <span className="wonder-nav-group">工具</span>, children: [
    { key: '/discovery', icon: <SearchOutlined />, label: '文献发现' },
    { key: '/citation', icon: <NodeIndexOutlined />, label: '引用网络' },
    { key: '/qa', icon: <ExperimentOutlined />, label: '追溯问答' },
  ]},
  { type: 'group' as const, label: <span className="wonder-nav-group">记录</span>, children: [
    { key: '/knowledge', icon: <BookOutlined />, label: '知识库' },
    { key: '/history', icon: <HistoryOutlined />, label: '历史记录' },
  ]},
]

// 声明 electronAPI 类型
declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
      onMaximizeChange: (cb: (maximized: boolean) => void) => () => void
      isElectron: boolean
    }
  }
}

function TitleBar({ sidebarVisible, onToggleSidebar }: { sidebarVisible: boolean; onToggleSidebar: () => void }) {
  const [isMaximized, setIsMaximized] = useState(false)
  const api = window.electronAPI

  useEffect(() => {
    if (!api?.onMaximizeChange) return
    return api.onMaximizeChange(setIsMaximized)
  }, [api])

  return (
    <div className="wonder-titlebar">
      <div className="wonder-titlebar-drag">
        <Tooltip title={sidebarVisible ? '隐藏侧栏' : '显示侧栏'} placement="bottom">
          <button className="wonder-titlebar-toggle" onClick={onToggleSidebar}>
            {sidebarVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          </button>
        </Tooltip>
        <div className="wonder-titlebar-logo">
          <img src="/patternLogo.png" alt="Wonder" className="wonder-titlebar-logo-img" />
          <span className="wonder-titlebar-name">Wonder</span>
        </div>
      </div>
      {api?.isElectron && (
        <div className="wonder-titlebar-controls">
          <button className="wonder-titlebar-btn" onClick={api.minimizeWindow} aria-label="最小化">
            <MinusOutlined />
          </button>
          <button className="wonder-titlebar-btn" onClick={api.maximizeWindow} aria-label={isMaximized ? '还原' : '最大化'}>
            {isMaximized ? <CloseSquareOutlined /> : <BorderOutlined />}
          </button>
          <button className="wonder-titlebar-btn wonder-titlebar-btn--close" onClick={api.closeWindow} aria-label="关闭">
            <CloseOutlined />
          </button>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const { settingsOpen, openSettings, closeSettings } = useUIStore()
  const { loadConfig } = useConfigStore()

  useEffect(() => { loadConfig() }, [loadConfig])

  if (location.pathname === '/welcome') {
    return (
      <>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
        </Routes>
        <SettingsModal open={settingsOpen} onClose={closeSettings} />
      </>
    )
  }

  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev)
  }, [])

  const sidebarWidth = collapsed ? 64 : 220

  return (
    <Layout className="wonder-app-layout">
      <TitleBar sidebarVisible={sidebarVisible} onToggleSidebar={toggleSidebar} />

      <Layout className="wonder-body-layout">
        {/* 侧边栏 */}
        <div className={`wonder-sidebar-wrapper ${sidebarVisible ? 'wonder-sidebar--visible' : 'wonder-sidebar--hidden'}`}
             style={{ width: sidebarVisible ? sidebarWidth : 0 }}>
          <Sider
            width={sidebarWidth}
            collapsedWidth={64}
            collapsed={collapsed}
            onCollapse={setCollapsed}
            collapsible
            trigger={null}
            className="wonder-sider"
          >
            <div className="wonder-brand">
              <img src="/patternLogo.png" alt="Wonder" className="wonder-brand-logo" />
              {!collapsed && (
                <>
                  <h1 className="wonder-brand-title">Wonder</h1>
                  <p className="wonder-brand-subtitle">Academic Research</p>
                </>
              )}
            </div>

            <Menu
              theme="light"
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
            />

            <div className="wonder-sidebar-footer">
              <button
                className="wonder-sidebar-settings-btn"
                onClick={() => openSettings()}
              >
                <SettingOutlined />
                {!collapsed && <span>设置</span>}
              </button>
            </div>
          </Sider>
        </div>

        {/* 主内容区 */}
        <Layout className="wonder-main-layout">
          <Content className="wonder-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/batch" element={<Batch />} />
              <Route path="/qa" element={<QA />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/citation" element={<CitationNetwork />} />
              <Route path="/citation/:paperId" element={<CitationNetwork />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/history" element={<History />} />
              <Route path="/history/:id" element={<HistoryDetail />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>

      <SettingsModal open={settingsOpen} onClose={closeSettings} />
    </Layout>
  )
}
