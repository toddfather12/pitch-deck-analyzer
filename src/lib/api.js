// Thin client for our own backend. The Anthropic key never reaches the browser.

export class ApiError extends Error {
  constructor(message, { code = 'unknown', status = 0 } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

const CLIENT_TIMEOUT_MS = 5 * 60 * 1000

export async function fetchConfig(signal) {
  try {
    const res = await fetch('/api/analyze', { signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function analyzePitch({ deck, context, mode, audience, stage, vertical, verticalCustom, file, accessCode, signal }) {
  const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  // Multipart so files go up as raw bytes (no base64 inflation). The browser sets the boundary header.
  const form = new FormData()
  for (const [k, v] of Object.entries({ deck, context, mode, audience, stage, vertical, verticalCustom })) form.set(k, v ?? '')
  if (file) form.set('file', file, file.name)

  let res
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: accessCode ? { 'X-Access-Code': accessCode } : {},
      body: form,
      signal: combined,
    })
  } catch (err) {
    if (signal?.aborted) throw new ApiError('Analysis cancelled.', { code: 'cancelled' })
    if (timeout.aborted) throw new ApiError('The request timed out. Try Quick mode or shorten the input.', { code: 'timeout' })
    throw new ApiError('Could not reach the server. Check your connection and try again.', { code: 'network' })
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON error page from a proxy/host */
  }

  if (!res.ok) {
    const fallback =
      res.status === 413
        ? 'That file is too large for this server. Try a smaller file or export a compressed PDF.'
        : res.status === 504 || res.status === 502
        ? 'The server timed out or is unavailable. Try Quick mode.'
        : `Request failed (${res.status}).`
    throw new ApiError(data?.error?.message || fallback, { code: data?.error?.code, status: res.status })
  }
  if (!data?.analysis) throw new ApiError('The server returned an unexpected response.', { code: 'bad_response' })
  return data
}
