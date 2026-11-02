# Pitch Deck Analyzer

Paste a pitch deck, get a structured, mentor-style analysis of the **business model**: a summary, stage, eight scored dimensions, tier 1 (deal-breaker) and tier 2 (worth exploring) issues, questions to ask the founders, competitive advantages, key assumptions, red flags, missing information, and an overall conviction level.

React 19 + Vite + Tailwind CSS 4 + lucide-react, with a small Node backend that calls Claude.

## What changed from v1

| | v1 | v2 |
|---|---|---|
| API key | `VITE_ANTHROPIC_API_KEY`, bundled into the browser (anyone can extract it) | `ANTHROPIC_API_KEY`, **server-side only** |
| Model | hard-coded old model | `claude-opus-5-5` by default, override with `ANTHROPIC_MODEL` |
| JSON | asked nicely, then `JSON.parse` and hope | **Structured outputs**: response is guaranteed to match the schema (`server/schema.js`) |
| Quick vs deep | different prompts | same schema; the model's `effort` setting (`low` / `high`) controls depth and latency |
| Tailwind | CDN script | build-time Tailwind 4 plugin (the CDN build isn't meant for production) |
| Safety | none | input limits, prompt-injection framing, per-IP rate limit, optional access code, refusal fallback |

## Run locally

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev            # web on :5173, API on :8787
```

Tests (no API key needed, the Claude client is stubbed): `npm test`

## Deploy

**Vercel**: import the repo, add `ANTHROPIC_API_KEY`. `api/analyze.js` becomes the serverless function; `vercel.json` raises its max duration for Deep mode. Deep analyses can take a minute or more, so use a plan that allows long function durations.

**Anywhere with Node or Docker** (Render, Fly, Railway, a VPS): `npm run build && npm start`, or `docker build -t pitch-deck-analyzer . && docker run -p 8787:8787 -e ANTHROPIC_API_KEY=... pitch-deck-analyzer`. `server/index.js` serves both the built app and the API.

## Layout

```
api/analyze.js        Vercel function (thin wrapper)
server/analyze.js     validation, rate limit, Claude call, error mapping (framework-agnostic)
server/schema.js      JSON schema + the 8 dimensions
server/prompts.js     system/user prompts, quick/deep settings
server/index.js       plain Node server (static + API)
src/                  React app (components, hooks/useAnalysis, lib/api)
```

## Notes

- If the app is public, set `ACCESS_CODE` and/or keep `RATE_LIMIT_PER_HOUR`. The limiter is in-memory per instance; use a shared store (e.g. Upstash Redis) if you scale out.
- To change the dimensions, edit `DIMENSIONS` in `server/schema.js`; the prompt and UI follow.
- Output is AI-generated and based only on what you paste. Treat it as a prompt for conversation, not a verdict.
