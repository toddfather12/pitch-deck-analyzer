// Framework-agnostic core: a Web-standard Request -> Response handler used by both the
// Vercel function (api/analyze.js) and the plain Node server (server/index.js).
// Keeps the API key server-side.
import Anthropic from '@anthropic-ai/sdk'
import { timingSafeEqual } from 'node:crypto'
import { ANALYSIS_SCHEMA, DIMENSIONS } from './schema.js'
import { MODES, buildSystemPrompt, buildUserPrompt } from './prompts.js'
import { ACCEPT_EXTENSIONS, FileError, prepareFile } from './files.js'
import { AUDIENCES, STAGE_IDS, VERTICAL_IDS } from '../shared/lenses.js'

export const LIMITS = { minDeck: 50, maxDeck: 60_000, maxContext: 5_000, maxVerticalCustom: 80 }

// claude-opus-5-5 is the default; override with ANTHROPIC_MODEL (e.g. claude-sonnet-5-5 for lower cost).
const model = () => process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'

// Vercel functions reject request bodies over ~4.5 MB, so default low there; Node/Docker hosts get more.
export const maxUploadMb = () => {
  const fromEnv = Number(process.env.MAX_UPLOAD_MB)
  if (fromEnv > 0) return Math.min(fromEnv, 30)
  return process.env.VERCEL ? 4 : 25
}

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
  maxUploadMb: maxUploadMb(),
  accept: ACCEPT_EXTENSIONS,
  configured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
})

const fail = (status, code, message) => ({ status, body: { error: { code, message } } })

/** Validate the plain-text fields. `hasFile` relaxes the pasted-text minimum. */
export function validate(fields, { hasFile = false } = {}) {
  if (!fields || typeof fields !== 'object') return 'Request body must be JSON or multipart form data.'
  const { deck = '', context = '', mode = 'quick', audience = 'accelerator', stage = 'auto', vertical = 'auto', verticalCustom = '' } = fields
  for (const [k, v] of Object.entries({ deck, context, verticalCustom }))
    if (typeof v !== 'string') return `Field "${k}" must be text.`
  if (!hasFile && deck.trim().length < LIMITS.minDeck)
    return `Paste at least ${LIMITS.minDeck} characters of pitch deck content, or upload a file.`
  if (deck.length > LIMITS.maxDeck)
    return `Pitch deck text is too long (${deck.length.toLocaleString()} characters; max ${LIMITS.maxDeck.toLocaleString()}).`
  if (context.length > LIMITS.maxContext) return `Context must be at most ${LIMITS.maxContext.toLocaleString()} characters.`
  if (verticalCustom.length > LIMITS.maxVerticalCustom) return `Custom vertical must be at most ${LIMITS.maxVerticalCustom} characters.`
  if (!Object.hasOwn(MODES, mode)) return 'Mode must be "quick" or "deep".'
  if (!AUDIENCES.some((a) => a.id === audience)) return 'Audience must be "accelerator" or "classroom".'
  if (stage !== 'auto' && !STAGE_IDS.includes(stage)) return 'Unknown stage.'
  if (vertical !== 'auto' && vertical !== 'other' && !VERTICAL_IDS.includes(vertical)) return 'Unknown vertical.'
  return null
}

// Guarantee all dimensions exist in canonical order, whatever the model returned.
function normalize(analysis) {
  const byId = new Map((analysis.dimensions ?? []).map((d) => [d.id, d]))
  analysis.dimensions = DIMENSIONS.map(
    ({ id, name }) => ({ gaps: [], assessment: 'Not assessed.', score: 1, ...byId.get(id), id, name }),
  )
  for (const key of ['strengths', 'stageReadiness', 'verticalMetrics', 'verticalRisks', 'founderNextSteps', 'tier1Issues', 'tier2Issues'])
    analysis[key] ??= []
  return analysis
}

/**
 * @param {{ fields: any, file?: File|null, ip?: string, accessCode?: string }} req
 * @param {{ client?: Anthropic }} [deps]  inject a client for tests
 * @returns {Promise<{ status: number, body: any }>}
 */
export async function handleAnalyze({ fields, file = null, ip = 'unknown', accessCode }, deps = {}) {
  if (!accessOk(accessCode)) return fail(401, 'access_denied', 'Missing or incorrect access code.')

  const problem = validate(fields, { hasFile: Boolean(file) })
  if (problem) return fail(400, 'invalid_request', problem)

  if (file && file.size > maxUploadMb() * 1024 * 1024)
    return fail(413, 'file_too_large', `File is too large (max ${maxUploadMb()} MB).`)

  if (!deps.client && !publicConfig().configured)
    return fail(500, 'not_configured', 'The server has no ANTHROPIC_API_KEY configured.')

  if (rateLimited(ip)) return fail(429, 'rate_limited', 'Too many analyses from your network. Try again later.')

  const { deck = '', context = '', mode = 'quick', audience = 'accelerator', stage = 'auto', vertical = 'auto', verticalCustom = '' } = fields

  let prepared = null
  if (file) {
    try {
      prepared = await prepareFile(file)
    } catch (err) {
      if (err instanceof FileError) return fail(err.status, err.code, err.message)
      console.error('[analyze] file processing failed:', err)
      return fail(422, 'bad_file', 'Could not read that file. Try exporting it as a PDF.')
    }
  }

  // Combine pasted text with text extracted from PPTX/DOCX/TXT.
  const deckText = [prepared?.kind === 'text' ? prepared.text : '', deck].filter((t) => t.trim()).join('\n\n')
  if (prepared?.kind === 'text' && prepared.text.trim().length < LIMITS.minDeck && !deck.trim())
    return fail(422, 'no_text', 'No readable text was found in that file. If the slides are images, export the deck as PDF and upload that.')

  const attachment = prepared?.kind === 'pdf' || prepared?.kind === 'image' ? prepared.kind : null
  const userText = buildUserPrompt({ deck: deckText, context, attachment, slideCount: prepared?.slideCount })
  const content = attachment === 'pdf'
    ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: prepared.base64 } }, { type: 'text', text: userText }]
    : attachment === 'image'
      ? [{ type: 'image', source: { type: 'base64', media_type: prepared.mediaType, data: prepared.base64 } }, { type: 'text', text: userText }]
      : userText

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
        system: buildSystemPrompt({ mode, audience, stage, vertical, verticalCustom }),
        messages: [{ role: 'user', content }],
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
          audience,
          stageSelected: stage,
          verticalSelected: vertical,
          model: message.model,
          ms: Date.now() - started,
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
          file: prepared ? { name: prepared.name, kind: prepared.kind, slideCount: prepared.slideCount ?? null } : null,
          notes: prepared?.notes ?? [],
        },
      },
    }
  } catch (err) {
    return mapError(err, { attachment })
  }
}

function mapError(err, { attachment }) {
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
    if (!overloaded && attachment === 'pdf')
      return fail(422, 'pdf_rejected', 'The AI provider could not read that PDF. It may be too long (600 pages max), password-protected, or damaged. Try exporting a fresh copy.')
    return fail(
      overloaded ? 503 : 502,
      overloaded ? 'overloaded' : 'upstream_error',
      overloaded ? 'The AI provider is busy. Retry shortly.' : 'The AI provider rejected the request.',
    )
  }
  console.error('[analyze] Unexpected error:', err)
  return fail(500, 'internal', 'Unexpected server error.')
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

/** Web-standard entry point. */
export async function handleRequest(request, deps = {}) {
  if (request.method === 'GET') return json(200, publicConfig())
  if (request.method !== 'POST') return json(405, { error: { code: 'method', message: 'Method not allowed.' } })

  const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim()
  const accessCode = request.headers.get('x-access-code') ?? undefined

  // Cheap check before reading a potentially large body.
  if (!accessOk(accessCode)) return json(401, fail(401, 'access_denied', 'Missing or incorrect access code.').body)

  let fields
  let file = null
  try {
    const type = request.headers.get('content-type') || ''
    if (type.includes('multipart/form-data')) {
      const form = await request.formData()
      fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'))
      const f = form.get('file')
      if (f && typeof f === 'object' && f.size > 0) file = f
    } else {
      fields = await request.json()
    }
  } catch {
    return json(400, fail(400, 'invalid_request', 'Could not read the request. Send JSON or multipart form data.').body)
  }

  const { status, body } = await handleAnalyze({ fields, file, ip, accessCode }, deps)
  return json(status, body)
}
