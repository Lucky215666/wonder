import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import History from '@/views/History.vue'
import HistoryDetail from '@/views/HistoryDetail.vue'
import Settings from '@/views/Settings.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/history', name: 'history', component: History },
    { path: '/history/:id', name: 'history-detail', component: HistoryDetail, props: true },
    { path: '/batch', name: 'batch', component: () => import('@/views/Batch.vue') },
    { path: '/qa', name: 'qa', component: () => import('@/views/QA.vue') },
    { path: '/discovery', name: 'discovery', component: () => import('@/views/Discovery.vue') },
    { path: '/citation', name: 'citation', component: () => import('@/views/CitationNetwork.vue') },
    { path: '/knowledge', name: 'knowledge', component: () => import('@/views/Knowledge.vue') },
    { path: '/settings', name: 'settings', component: Settings },
  ],
})

export default router
