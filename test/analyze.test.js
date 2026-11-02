import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import Anthropic from '@anthropic-ai/sdk'
import { handleAnalyze, handleRequest, validate, rateLimited } from '../server/analyze.js'
import { runNode } from '../server/node-adapter.js'
import { deck, stub, failing, ok, makePptx, makeDocx, PDF, PNG, fileOf } from './helpers.js'

test('validate rejects bad input', () => {
  assert.match(validate({ deck: 'short' }), /at least/)
  assert.equal(validate({ deck: '' }, { hasFile: true }), null)
  assert.match(validate({ deck, mode: 'turbo' }), /Mode/)
  assert.match(validate({ deck, audience: 'vc' }), /Audience/)
  assert.match(validate({ deck, stage: 'ipo' }), /stage/)
  assert.match(validate({ deck, vertical: 'crypto' }), /vertical/)
  assert.match(validate({ deck: 'x'.repeat(60_001) }), /too long/)
  assert.equal(validate({ deck, mode: 'deep', stage: 'seed', vertical: 'fintech', audience: 'classroom' }), null)
  assert.equal(validate({ deck, vertical: 'other', verticalCustom: 'Space tourism' }), null)
})

test('success: normalizes dimensions, sends structured-output request, no sampling params', async () => {
  const cap = {}
  const r = await handleAnalyze({ fields: { deck, mode: 'deep' }, ip: 't1' }, { client: stub(ok({ dimensions: [{ id: 'moat', score: 4, assessment: 'a', gaps: [] }] }), cap) })
  assert.equal(r.status, 200)
  assert.equal(r.body.analysis.dimensions.length, 8)
  assert.equal(r.body.analysis.dimensions[0].id, 'customer')
  assert.equal(r.body.analysis.dimensions[5].score, 4)
  assert.deepEqual(r.body.analysis.stageReadiness, [])
  assert.equal(cap.params.output_config.effort, 'high')
  assert.equal(cap.params.output_config.format.type, 'json_schema')
  assert.equal('temperature' in cap.params, false)
  assert.match(cap.params.messages[0].content, /<pitch_deck>/)
})

test('stage and vertical lenses and audience reach the system prompt', async () => {
  const cap = {}
  await handleAnalyze({ fields: { deck, stage: 'seed', vertical: 'fintech', audience: 'classroom' }, ip: 'l1' }, { client: stub(ok({}), cap) })
  const sys = cap.params.system
  assert.match(sys, /selected by the user: Seed/)
  assert.match(sys, /Repeatable|repeatable early engine/)
  assert.match(sys, /selected by the user: Fintech/)
  assert.match(sys, /Take rate/)
  assert.match(sys, /classroom/i)

  await handleAnalyze({ fields: { deck }, ip: 'l2' }, { client: stub(ok({}), cap) })
  assert.match(cap.params.system, /not specified - detect it/)
  assert.match(cap.params.system, /not specified - infer it/)

  await handleAnalyze({ fields: { deck, vertical: 'other', verticalCustom: 'Space tourism' }, ip: 'l3' }, { client: stub(ok({}), cap) })
  assert.match(cap.params.system, /Space tourism/)
})

test('quick mode uses low effort', async () => {
  const cap = {}
  await handleAnalyze({ fields: { deck }, ip: 't2' }, { client: stub(ok({}), cap) })
  assert.equal(cap.params.output_config.effort, 'low')
})

test('PDF is sent natively as a document block; image as image block', async () => {
  const cap = {}
  const r = await handleAnalyze({ fields: { deck: '' }, file: fileOf(PDF, 'deck.pdf'), ip: 'f1' }, { client: stub(ok({}), cap) })
  assert.equal(r.status, 200)
  const [doc, text] = cap.params.messages[0].content
  assert.equal(doc.type, 'document')
  assert.equal(doc.source.media_type, 'application/pdf')
  assert.equal(doc.source.data, PDF.toString('base64'))
  assert.match(text.text, /attached PDF/)
  assert.equal(r.body.meta.file.kind, 'pdf')

  await handleAnalyze({ fields: {}, file: fileOf(PNG, 'slide.png'), ip: 'f2' }, { client: stub(ok({}), cap) })
  assert.equal(cap.params.messages[0].content[0].type, 'image')
  assert.equal(cap.params.messages[0].content[0].source.media_type, 'image/png')
})

test('PPTX: text extracted in presentation order with notes; image-only slides flagged', async () => {
  const cap = {}
  const r = await handleAnalyze({ fields: {}, file: fileOf(await makePptx(), 'deck.pptx'), ip: 'f3' }, { client: stub(ok({}), cap) })
  assert.equal(r.status, 200)
  const prompt = cap.params.messages[0].content
  assert.match(prompt, /4-slide presentation/)
  assert.ok(prompt.indexOf('LoopLedger') < prompt.indexOf('Plumbers lose'), 'slide order follows presentation.xml')
  assert.match(prompt, /late invoices & chasing/) // entity decoded
  assert.match(prompt, /Speaker notes: Say: churn is 4% monthly/)
  assert.doesNotMatch(prompt, /Speaker notes:.* 2$/m) // slide-number placeholder dropped
  assert.match(prompt, /\[Image: Revenue chart\]/)
  assert.match(r.body.meta.notes[0], /Slide 4/)
  assert.equal(r.body.meta.file.slideCount, 4)
})

test('DOCX and TXT are extracted; pasted text is combined with file text', async () => {
  const cap = {}
  await handleAnalyze({ fields: { deck: 'Extra pasted note about pricing tiers and more.' }, file: fileOf(await makeDocx(['Hello &amp; welcome', 'We sell widgets to plumbers across the region.']), 'memo.docx'), ip: 'f4' }, { client: stub(ok({}), cap) })
  assert.match(cap.params.messages[0].content, /Hello & welcome\nWe sell widgets/)
  assert.match(cap.params.messages[0].content, /Extra pasted note/)
  const r = await handleAnalyze({ fields: {}, file: fileOf(Buffer.from(deck), 'deck.txt'), ip: 'f5' }, { client: stub(ok({}), cap) })
  assert.equal(r.status, 200)
})

test('file errors are friendly and never reach the model', async () => {
  const never = { beta: { messages: { stream: () => { throw new Error('should not be called') } } } }
  const h = (file, ip) => handleAnalyze({ fields: {}, file, ip }, { client: never })
  assert.match((await h(fileOf(Buffer.from('x'), 'old.ppt'), 'e1')).body.error.message, /Export the deck as PDF/)
  assert.match((await h(fileOf(Buffer.from('x'), 'a.exe'), 'e2')).body.error.message, /Unsupported file type/)
  assert.match((await h(fileOf(Buffer.from('not a pdf'), 'a.pdf'), 'e3')).body.error.message, /not a valid PDF/)
  assert.match((await h(fileOf(Buffer.from('PKnot really'), 'a.pptx'), 'e4')).body.error.message, /valid PPTX/)
  const blank = await makeDocx([])
  assert.equal((await h(fileOf(blank, 'blank.docx'), 'e5')).body.error.code, 'no_text')
  assert.equal((await h(fileOf(Buffer.alloc(0), 'z.pdf'), 'e6')).status, 400)
})

test('refusal, truncation, malformed output', async () => {
  const base = { model: 'm', usage: {}, content: [] }
  const run = (m) => handleAnalyze({ fields: { deck }, ip: 't3' }, { client: stub(m) })
  assert.equal((await run({ ...base, stop_reason: 'refusal' })).body.error.code, 'refused')
  assert.equal((await run({ ...base, stop_reason: 'max_tokens' })).body.error.code, 'truncated')
  assert.equal((await run({ ...base, stop_reason: 'end_turn', content: [{ type: 'text', text: '{nope' }] })).body.error.code, 'bad_response')
})

test('maps Anthropic errors without leaking details', async () => {
  const h = (e, file) => handleAnalyze({ fields: { deck }, file, ip: 't4' }, { client: failing(e) })
  const auth = await h(new Anthropic.AuthenticationError(401, { error: { message: 'sk-ant-secret' } }, 'sk-ant-secret', new Headers()))
  assert.equal(auth.status, 500)
  assert.doesNotMatch(JSON.stringify(auth.body), /sk-ant/)
  assert.equal((await h(new Anthropic.RateLimitError(429, {}, 'x', new Headers()))).status, 429)
  assert.equal((await h(new Anthropic.APIConnectionTimeoutError())).status, 504)
  assert.equal((await h(new Error('boom'))).status, 500)
  const badPdf = await h(new Anthropic.BadRequestError(400, {}, 'bad', new Headers()), fileOf(PDF, 'd.pdf'))
  assert.equal(badPdf.body.error.code, 'pdf_rejected')
})

test('access code and rate limit', async () => {
  process.env.ACCESS_CODE = 'sesame'
  assert.equal((await handleAnalyze({ fields: { deck }, accessCode: 'wrong' }, { client: stub(ok({})) })).status, 401)
  assert.equal((await handleAnalyze({ fields: { deck }, ip: 't5', accessCode: 'sesame' }, { client: stub(ok({})) })).status, 200)
  delete process.env.ACCESS_CODE
  process.env.RATE_LIMIT_PER_HOUR = '2'
  assert.equal(rateLimited('rl'), false); assert.equal(rateLimited('rl'), false); assert.equal(rateLimited('rl'), true)
  delete process.env.RATE_LIMIT_PER_HOUR
})

test('handleRequest: multipart form with file, and JSON body, and bad body', async () => {
  const cap = {}
  const fd = new FormData()
  fd.set('mode', 'deep'); fd.set('stage', 'pre-seed'); fd.set('deck', '')
  fd.set('file', fileOf(PDF, 'deck.pdf', 'application/pdf'))
  const r1 = await handleRequest(new Request('http://x/api/analyze', { method: 'POST', body: fd, headers: { 'x-forwarded-for': 'm1' } }), { client: stub(ok({}), cap) })
  assert.equal(r1.status, 200)
  assert.equal(cap.params.messages[0].content[0].type, 'document')
  assert.match(cap.params.system, /Pre-seed/)

  const r2 = await handleRequest(new Request('http://x/api/analyze', { method: 'POST', body: JSON.stringify({ deck }), headers: { 'content-type': 'application/json', 'x-forwarded-for': 'm2' } }), { client: stub(ok({})) })
  assert.equal(r2.status, 200)
  const r3 = await handleRequest(new Request('http://x/api/analyze', { method: 'POST', body: '{bad', headers: { 'content-type': 'application/json' } }))
  assert.equal(r3.status, 400)
  assert.equal((await handleRequest(new Request('http://x/api/analyze', { method: 'DELETE' }))).status, 405)
  const cfg = await (await handleRequest(new Request('http://x/api/analyze'))).json()
  assert.ok(cfg.accept.includes('.pptx') && cfg.maxUploadMb > 0)
})

test('real HTTP upload through the Node adapter, including the size cap', async () => {
  process.env.MAX_UPLOAD_MB = '1'
  const server = http.createServer((req, res) => runNode(req, res, { client: stub(ok({})) }))
  await new Promise((r) => server.listen(0, r))
  const url = `http://localhost:${server.address().port}/api/analyze`
  try {
    const small = new FormData(); small.set('file', fileOf(await makePptx(), 'd.pptx')); small.set('stage', 'seed')
    const r1 = await fetch(url, { method: 'POST', body: small, headers: { 'x-forwarded-for': 'h1' } })
    assert.equal(r1.status, 200)
    assert.equal((await r1.json()).meta.file.kind, 'text')

    const big = new FormData(); big.set('file', fileOf(Buffer.concat([PDF, Buffer.alloc(3 * 1024 * 1024)]), 'big.pdf'))
    const r2 = await fetch(url, { method: 'POST', body: big, headers: { 'x-forwarded-for': 'h2' } })
    assert.equal(r2.status, 413)
    assert.match((await r2.json()).error.message, /max 1 MB/)
  } finally {
    server.close(); delete process.env.MAX_UPLOAD_MB
  }
})
