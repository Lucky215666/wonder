import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getConfig, updateConfig } from '../api'

export const useConfigStore = defineStore('config', () => {
  const config = ref({
    model: {
      provider: 'MiniMax',
      api_key: '',
      base_url: 'https://api.minimaxi.com/v1',
      model_name: 'MiniMax-M2.7',
    },
    research: {
      background: '',
      writing_style: '本科毕业论文风格，表达清晰，避免过度复杂',
    },
    watch: {
      enabled: false,
      folder: 'data/watch',
      auto_delete_after_process: false,
    },
    analysis: {
      max_chars: 7000,
      overlap: 500,
    },
  })
  const loading = ref(false)

  async function fetchConfig() {
    loading.value = true
    try {
      const { data } = await getConfig()
      config.value = data
    } finally {
      loading.value = false
    }
  }

  async function saveConfig() {
    loading.value = true
    try {
      await updateConfig(config.value)
    } finally {
      loading.value = false
    }
  }

  return { config, loading, fetchConfig, saveConfig }
})
