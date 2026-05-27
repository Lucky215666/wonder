import { defineStore } from 'pinia'
import { ref } from 'vue'
import { analyzeFile } from '../api'

export const useAnalysisStore = defineStore('analysis', () => {
  const result = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function analyze(file, maxChars, overlap) {
    loading.value = true
    error.value = null
    result.value = null
    try {
      const { data } = await analyzeFile(file, maxChars, overlap)
      result.value = data
      return data
    } catch (e) {
      error.value = e.response?.data?.detail || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  function clear() {
    result.value = null
    error.value = null
  }

  return { result, loading, error, analyze, clear }
})
