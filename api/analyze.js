// Vercel serverless function. (Also works on any host that supports Node-style handlers.)
import { handleAnalyze, publicConfig } from '../server/analyze.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') return res.status(200).json(publicConfig())
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: { code: 'method', message: 'Method not allowed.' } })
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
  const { status, body } = await handleAnalyze({
    body: req.body,
    ip,
    accessCode: req.headers['x-access-code'],
  })
  res.status(status).json(body)
}
