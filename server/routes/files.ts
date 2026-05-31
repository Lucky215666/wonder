import { Hono } from 'hono'
import { PDFParse } from 'pdf-parse'
import * as mammoth from 'mammoth'

export function filesRoutes() {
  const app = new Hono()

  app.post('/parse', async (c) => {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      return c.json({ error: '请上传文件' }, 400)
    }

    const fileName = file.name
    const ext = fileName.split('.').pop()?.toLowerCase()

    if (!['pdf', 'docx', 'txt', 'md'].includes(ext ?? '')) {
      return c.json({ error: `不支持的文件格式: .${ext}` }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      let text = ''

      if (ext === 'pdf') {
        const parser = new PDFParse({ data: buffer })
        const result = await parser.getText()
        text = result.text
        await parser.destroy()
      } else if (ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
      } else {
        text = buffer.toString('utf-8')
      }

      return c.json({ text, fileName })
    } catch (err) {
      const message = err instanceof Error ? err.message : '文件解析失败'
      return c.json({ error: message }, 500)
    }
  })

  return app
}
