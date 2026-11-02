// Zero-dependency Node server: serves the built SPA and the /api/analyze endpoint.
// Use for local dev (`npm run dev`), Docker, Render, Fly, Railway, a VPS, etc.
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleAnalyze, publicConfig } from './analyze.js'

const dist = resolve(fileURLToPath(new URL('../dist', import.meta.url)))
const PORT = Number(process.env.PORT || 8787)
const MAX_BODY = 200_000
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png',
}

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) { reject(new Error('too_large')); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => {
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(new Error('bad_json')) }
    })
    req.on('error', reject)
  })
}

async function serveStatic(req, res) {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
  let file = join(dist, path)
  if (!file.startsWith(dist)) return json(res, 403, { error: { code: 'forbidden', message: 'Forbidden' } })
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(dist, 'index.html') // SPA fallback
  }
  try {
    const data = await readFile(file)
    const immutable = file.includes(`${join(dist, 'assets')}`)
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found. Run `npm run build` first, or use `npm run dev`.')
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x')
    if (pathname === '/api/analyze') {
      if (req.method === 'GET') return json(res, 200, publicConfig())
      if (req.method !== 'POST') return json(res, 405, { error: { code: 'method', message: 'Method not allowed.' } })
      let body
      try { body = await readJson(req) } catch (e) {
        const tooBig = e.message === 'too_large'
        return json(res, tooBig ? 413 : 400, { error: { code: 'invalid_request', message: tooBig ? 'Request too large.' : 'Body must be valid JSON.' } })
      }
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
      const { status, body: out } = await handleAnalyze({ body, ip, accessCode: req.headers['x-access-code'] })
      return json(res, status, out)
    }
    if (pathname === '/healthz') return json(res, 200, { ok: true })
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: { code: 'method', message: 'Method not allowed.' } })
    await serveStatic(req, res)
  } catch (err) {
    console.error(err)
    if (!res.headersSent) json(res, 500, { error: { code: 'internal', message: 'Unexpected server error.' } })
  }
})

server.requestTimeout = 5 * 60_000
server.listen(PORT, () => console.log(`pitch-deck-analyzer API/server on http://localhost:${PORT}`))
