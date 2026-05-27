import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 min for long analysis
})

// Config
export const getConfig = () => api.get('/config')
export const updateConfig = (config) => api.put('/config', config)

// History
export const getHistory = () => api.get('/history')
export const getHistoryItem = (id) => api.get(`/history/${id}`)
export const deleteHistoryItem = (id) => api.delete(`/history/${id}`)

// Analysis
export const analyzeFile = (file, maxChars = 7000, overlap = 500) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('max_chars', maxChars)
  formData.append('overlap', overlap)
  return api.post('/analysis/single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// Health
export const healthCheck = () => api.get('/health')

export default api
