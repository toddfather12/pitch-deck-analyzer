// Zero-dependency Node server: serves the built SPA and the /api/analyze endpoint.
// Use for local dev (`npm run dev`), Docker, Render, Fly, Railway, a VPS, etc.
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runNode } from './node-adapter.js'

const dist = resolve(fileURLToPath(new URL('../dist', import.meta.url)))
const PORT = Number(process.env.PORT || 8787)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png',
}

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
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
    if (pathname === '/api/analyze') return runNode(req, res)
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
