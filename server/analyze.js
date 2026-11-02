// Framework-agnostic core: used by both the Vercel function (api/analyze.js)
// and the plain Node server (server/index.js). Keeps the API key server-side.
import Anthropic from '@anthropic-ai/sdk'
import { timingSafeEqual } from 'node:crypto'
import { ANALYSIS_SCHEMA, DIMENSIONS } from './schema.js'
import { MODES, buildSystemPrompt, buildUserPrompt } from './prompts.js'

export const LIMITS = { minDeck: 50, maxDeck: 60_000, maxContext: 5_000 }

// claude-opus-5-5 is the default; override with ANTHROPIC_MODEL (e.g. claude-sonnet-5-5 for lower cost).
const model = () => process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'

let sharedClient
const getClient = () => (sharedClient ??= new Anthropic({ maxRetries: 2, timeout: 4 * 60_000 }))

// ---- tiny in-memory rate limiter (per instance; use Redis/Upstash if you scale out) ----
const hits = new Map()
export function rateLimited(key, now = Date.now()) {
  const max = Number(process.env.RATE_LIMIT_PER_HOUR || 20)
  if (!max) return false
  const windowMs = 60 * 60 * 1000
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  return false
}

function accessOk(provided) {
  const required = process.env.ACCESS_CODE
  if (!required) return true
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(required)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const publicConfig = () => ({
  requiresAccessCode: Boolean(process.env.ACCESS_CODE),
  limits: LIMITS,
  configured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
})

const fail = (status, code, message) => ({ status, body: { error: { code, message } } })

export function validate(body) {
  if (!body || typeof body !== 'object') return 'Request body must be JSON.'
  const { deck, context = '', mode = 'quick' } = body
  if (typeof deck !== 'string' || deck.trim().length < LIMITS.minDeck)
    return `Paste at least ${LIMITS.minDeck} characters of pitch deck content.`
  if (deck.length > LIMITS.maxDeck)
    return `Pitch deck text is too long (${deck.length.toLocaleString()} characters; max ${LIMITS.maxDeck.toLocaleString()}).`
  if (typeof context !== 'string' || context.length > LIMITS.maxContext)
    return `Context must be text of at most ${LIMITS.maxContext.toLocaleString()} characters.`
  if (!Object.hasOwn(MODES, mode)) return 'Mode must be "quick" or "deep".'
  return null
}

// Guarantee all 8 dimensions exist in canonical order, whatever the model returned.
function normalize(analysis) {
  const byId = new Map((analysis.dimensions ?? []).map((d) => [d.id, d]))
  analysis.dimensions = DIMENSIONS.map(
    ({ id, name }) => ({ gaps: [], assessment: 'Not assessed.', score: 1, ...byId.get(id), id, name }),
  )
  return analysis
}

/**
 * @param {{ body: any, ip?: string, accessCode?: string }} req
 * @param {{ client?: Anthropic }} [deps]  inject a client for tests
 * @returns {Promise<{ status: number, body: any }>}
 */
export async function handleAnalyze({ body, ip = 'unknown', accessCode }, deps = {}) {
  if (!accessOk(accessCode)) return fail(401, 'access_denied', 'Missing or incorrect access code.')

  const problem = validate(body)
  if (problem) return fail(400, 'invalid_request', problem)

  if (!deps.client && !publicConfig().configured)
    return fail(500, 'not_configured', 'The server has no ANTHROPIC_API_KEY configured.')

  if (rateLimited(ip)) return fail(429, 'rate_limited', 'Too many analyses from your network. Try again later.')

  const { deck, context = '', mode = 'quick' } = body
  const { effort, maxTokens } = MODES[mode]
  const started = Date.now()

  try {
    const client = deps.client ?? getClient()
    // Streaming avoids HTTP timeouts on long outputs; we still return one JSON response.
    const message = await client.beta.messages
      .stream({
        model: model(),
        max_tokens: maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default', // re-run on a fallback model if safety classifiers decline
        system: buildSystemPrompt(mode),
        messages: [{ role: 'user', content: buildUserPrompt({ deck, context }) }],
        output_config: { effort, format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } },
      })
      .finalMessage()

    if (message.stop_reason === 'refusal')
      return fail(422, 'refused', 'The model declined to analyze this content.')
    if (message.stop_reason === 'max_tokens')
      return fail(502, 'truncated', 'The analysis was cut off. Try Quick mode or shorten the input.')

    const text = message.content.find((b) => b.type === 'text')?.text
    if (!text) return fail(502, 'empty_response', 'The model returned no analysis. Please retry.')

    let analysis
    try {
      analysis = JSON.parse(text)
    } catch {
      return fail(502, 'bad_response', 'The model returned malformed output. Please retry.')
    }

    return {
      status: 200,
      body: {
        analysis: normalize(analysis),
        meta: {
          mode,
          model: message.model,
          ms: Date.now() - started,
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
        },
      },
    }
  } catch (err) {
    return mapError(err)
  }
}

function mapError(err) {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    console.error('[analyze] Anthropic auth error:', err.message)
    return fail(500, 'server_auth', 'The server could not authenticate with the AI provider.')
  }
  if (err instanceof Anthropic.RateLimitError)
    return fail(429, 'upstream_rate_limited', 'The AI provider is rate limiting requests. Retry in a minute.')
  if (err instanceof Anthropic.APIConnectionTimeoutError)
    return fail(504, 'timeout', 'The analysis timed out. Try Quick mode or shorten the input.')
  if (err instanceof Anthropic.APIConnectionError)
    return fail(502, 'upstream_unreachable', 'Could not reach the AI provider. Retry shortly.')
  if (err instanceof Anthropic.APIError) {
    console.error('[analyze] Anthropic API error:', err.status, err.message)
    const overloaded = err.status === 529 || err.status >= 500
    return fail(
      overloaded ? 503 : 502,
      overloaded ? 'overloaded' : 'upstream_error',
      overloaded ? 'The AI provider is busy. Retry shortly.' : 'The AI provider rejected the request.',
    )
  }
  console.error('[analyze] Unexpected error:', err)
  return fail(500, 'internal', 'Unexpected server error.')
}
