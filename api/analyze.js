// Vercel serverless function. (Also works on any host that supports Node-style handlers.)
import { runNode } from '../server/node-adapter.js'

export default function handler(req, res) {
  return runNode(req, res)
}
