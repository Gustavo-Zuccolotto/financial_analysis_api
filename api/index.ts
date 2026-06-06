import type { IncomingMessage, ServerResponse } from 'http'
import app from '../src/index'

export const config = { runtime: 'nodejs' }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = req.headers.host || 'localhost'
  const url = `${protocol}://${host}${req.url}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }
  }

  let body: string | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<string>((resolve) => {
      let data = ''
      req.on('data', (chunk: Buffer) => { data += chunk.toString() })
      req.on('end', () => resolve(data))
    })
  }

  const request = new Request(url, {
    method: req.method ?? 'GET',
    headers,
    body: body || undefined,
  })

  const response = await app.fetch(request)

  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(await response.text())
}
