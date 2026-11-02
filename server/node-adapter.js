// Bridges Node's (req, res) to the Web-standard handler in analyze.js.
// Used by the Vercel function and the plain Node server, so both run the same code path.
import { handleRequest, maxUploadMb } from './analyze.js'

const OVERHEAD = 512 * 1024 // multipart framing + text fields

export async function runNode(req, res, deps) {
  const limit = maxUploadMb() * 1024 * 1024 + OVERHEAD
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }
  const tooLarge = () =>
    send(413, { error: { code: 'file_too_large', message: `Upload is too large (max ${maxUploadMb()} MB).` } })

  const declared = Number(req.headers['content-length'])
  if (declared > limit) return tooLarge()

  let overflow = false
  let seen = 0
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const body = hasBody
    ? new ReadableStream({
        start(controller) {
          req.on('data', (chunk) => {
            seen += chunk.length
            if (seen > limit) {
              overflow = true
              controller.error(new Error('too_large'))
              req.destroy()
            } else controller.enqueue(chunk)
          })
          req.on('end', () => !overflow && controller.close())
          req.on('error', (e) => controller.error(e))
        },
      })
    : undefined

  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
  if (!headers.has('x-forwarded-for') && req.socket?.remoteAddress) headers.set('x-forwarded-for', req.socket.remoteAddress)

  try {
    const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
      method: req.method,
      headers,
      body,
      duplex: 'half',
    })
    const response = await handleRequest(request, deps)
    if (overflow) return tooLarge()
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (err) {
    if (overflow) return tooLarge()
    console.error('[adapter]', err)
    if (!res.headersSent) send(500, { error: { code: 'internal', message: 'Unexpected server error.' } })
  }
}
