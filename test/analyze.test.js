import test from 'node:test'
import assert from 'node:assert/strict'
import Anthropic from '@anthropic-ai/sdk'
import { handleAnalyze, validate, rateLimited } from '../server/analyze.js'

const deck = 'Acme sells AI widgets to SMBs for $99/month. We have 40 paying customers and 5% monthly churn.'
const stub = (message, capture) => ({
  beta: { messages: { stream: (params) => { capture && (capture.params = params); return { finalMessage: async () => message } } } },
})
const failing = (err) => ({ beta: { messages: { stream: () => ({ finalMessage: async () => { throw err } }) } } })
const ok = (obj) => ({ stop_reason: 'end_turn', model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 2 }, content: [{ type: 'text', text: JSON.stringify(obj) }] })

test('validate rejects bad input', () => {
  assert.match(validate({ deck: 'short' }), /at least/)
  assert.match(validate({ deck, mode: 'turbo' }), /Mode/)
  assert.match(validate({ deck: 'x'.repeat(60_001) }), /too long/)
  assert.equal(validate({ deck, mode: 'deep', context: 'ex-Stripe' }), null)
})

test('success: normalizes dimensions to all 8 in order and sends structured-output request', async () => {
  const cap = {}
  const r = await handleAnalyze({ body: { deck, mode: 'deep' }, ip: 't1' }, { client: stub(ok({ dimensions: [{ id: 'moat', score: 4, assessment: 'a', gaps: [] }], tier1Issues: [] }), cap) })
  assert.equal(r.status, 200)
  assert.equal(r.body.analysis.dimensions.length, 8)
  assert.equal(r.body.analysis.dimensions[0].id, 'customer')
  assert.equal(r.body.analysis.dimensions[5].score, 4)
  assert.equal(cap.params.output_config.effort, 'high')
  assert.equal(cap.params.output_config.format.type, 'json_schema')
  assert.equal('temperature' in cap.params, false)
  assert.match(cap.params.messages[0].content, /<pitch_deck>/)
})

test('quick mode uses low effort', async () => {
  const cap = {}
  await handleAnalyze({ body: { deck }, ip: 't2' }, { client: stub(ok({}), cap) })
  assert.equal(cap.params.output_config.effort, 'low')
})

test('refusal, truncation, malformed output', async () => {
  const base = { model: 'm', usage: {}, content: [] }
  assert.equal((await handleAnalyze({ body: { deck }, ip: 't3' }, { client: stub({ ...base, stop_reason: 'refusal' }) })).body.error.code, 'refused')
  assert.equal((await handleAnalyze({ body: { deck }, ip: 't3' }, { client: stub({ ...base, stop_reason: 'max_tokens' }) })).body.error.code, 'truncated')
  assert.equal((await handleAnalyze({ body: { deck }, ip: 't3' }, { client: stub({ ...base, stop_reason: 'end_turn', content: [{ type: 'text', text: '{nope' }] }) })).body.error.code, 'bad_response')
})

test('maps Anthropic errors without leaking details', async () => {
  const h = (e) => handleAnalyze({ body: { deck }, ip: 't4' }, { client: failing(e) })
  const auth = await h(new Anthropic.AuthenticationError(401, { error: { message: 'sk-ant-secret' } }, 'sk-ant-secret', new Headers()))
  assert.equal(auth.status, 500)
  assert.doesNotMatch(JSON.stringify(auth.body), /sk-ant/)
  assert.equal((await h(new Anthropic.RateLimitError(429, {}, 'x', new Headers()))).status, 429)
  assert.equal((await h(new Anthropic.APIConnectionTimeoutError())).status, 504)
  assert.equal((await h(new Error('boom'))).status, 500)
})

test('access code and rate limit', async () => {
  process.env.ACCESS_CODE = 'sesame'
  assert.equal((await handleAnalyze({ body: { deck }, accessCode: 'wrong' }, { client: stub(ok({})) })).status, 401)
  assert.equal((await handleAnalyze({ body: { deck }, ip: 't5', accessCode: 'sesame' }, { client: stub(ok({})) })).status, 200)
  delete process.env.ACCESS_CODE
  process.env.RATE_LIMIT_PER_HOUR = '2'
  assert.equal(rateLimited('rl'), false); assert.equal(rateLimited('rl'), false); assert.equal(rateLimited('rl'), true)
  delete process.env.RATE_LIMIT_PER_HOUR
})
