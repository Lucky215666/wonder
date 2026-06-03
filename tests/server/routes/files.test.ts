import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { filesRoutes } from '../../../server/routes/files'

function createApp() {
  const app = new Hono()
  app.route('/api/files', filesRoutes())
  return app
}

function makeTxtFile(content: string, name = 'test.txt') {
  const blob = new Blob([content], { type: 'text/plain' })
  return new File([blob], name)
}

function makeFormWithFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  return form
}

describe('filesRoutes - POST /parse', () => {
  it('returns 400 when no file is provided', async () => {
    const app = createApp()
    const form = new FormData()

    const res = await app.request('/api/files/parse', { method: 'POST', body: form })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('请上传文件')
  })

  it('returns 400 for unsupported file extension', async () => {
    const app = createApp()
    const file = makeTxtFile('content', 'data.xlsx')
    const form = makeFormWithFile(file)

    const res = await app.request('/api/files/parse', { method: 'POST', body: form })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('不支持的文件格式')
  })

  it('parses a txt file and returns text', async () => {
    const app = createApp()
    const file = makeTxtFile('hello world', 'notes.txt')
    const form = makeFormWithFile(file)

    const res = await app.request('/api/files/parse', { method: 'POST', body: form })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('hello world')
    expect(body.fileName).toBe('notes.txt')
  })

  it('parses a md file and returns text', async () => {
    const app = createApp()
    const file = makeTxtFile('# Heading\n\nBody text', 'readme.md')
    const form = makeFormWithFile(file)

    const res = await app.request('/api/files/parse', { method: 'POST', body: form })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toContain('# Heading')
    expect(body.fileName).toBe('readme.md')
  })

  it('returns 400 for file without extension', async () => {
    const app = createApp()
    const file = makeTxtFile('content', 'noext')
    const form = makeFormWithFile(file)

    const res = await app.request('/api/files/parse', { method: 'POST', body: form })

    expect(res.status).toBe(400)
  })
})
