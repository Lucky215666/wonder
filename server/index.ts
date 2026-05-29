import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { StorageService } from './services/storage'
import { LLMService } from './services/llm'
import { analysisRoutes } from './routes/analysis'
import { knowledgeRoutes } from './routes/knowledge'
import { historyRoutes } from './routes/history'
import { configRoutes } from './routes/config'
import path from 'path'
import fs from 'fs'

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const storage = StorageService.create(dataDir)
const llmService = new LLMService(storage)

const app = new Hono()
app.use('/*', cors())

app.route('/api/analysis', analysisRoutes(storage, llmService))
app.route('/api/knowledge', knowledgeRoutes(storage, llmService))
app.route('/api/history', historyRoutes(storage))
app.route('/api/config', configRoutes(storage))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Serve frontend static files from dist/renderer
const rendererDir = path.resolve(__dirname, '../dist/renderer')

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

app.get('*', (c) => {
  const urlPath = new URL(c.req.url).pathname
  const filePath = path.join(rendererDir, urlPath)

  // Try to serve the exact file
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath)
    const mime = mimeTypes[ext] || 'application/octet-stream'
    const content = fs.readFileSync(filePath)
    return new Response(content, {
      headers: { 'Content-Type': mime },
    })
  }

  // SPA fallback: serve index.html
  const indexPath = path.join(rendererDir, 'index.html')
  const html = fs.readFileSync(indexPath, 'utf-8')
  return c.html(html)
})

const port = parseInt(process.env.PORT || '9800')
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
  console.log(`Wonder server running on http://127.0.0.1:${port}`)
})
