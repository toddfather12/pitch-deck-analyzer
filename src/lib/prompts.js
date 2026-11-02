// Client-side copy: mode descriptions and a sample deck. The actual analysis prompt
// lives on the server (server/prompts.js) so it can't be tampered with from the browser.

export const MODES = [
  { id: 'quick', label: 'Quick', time: '~30 sec', blurb: 'Fast read: headline issues and top questions.' },
  { id: 'deep', label: 'Deep', time: '~45+ sec', blurb: 'Thorough: cross-checks numbers, fuller reasoning.' },
]

export const SAMPLE_DECK = `LoopLedger - Slide text

Problem: Small trade businesses (plumbers, electricians, HVAC) lose ~12% of revenue to late invoices and manual bookkeeping.

Solution: LoopLedger is a mobile app that turns a finished job photo + voice note into an invoice, sends it, and chases payment automatically.

Market: 3.1M trade businesses in the US. $40B annual spend on SMB accounting software.

Business model: $49/month per business + 1.2% fee on payments processed through LoopLedger.

Traction: 18 months in. 410 paying businesses, $31k MRR, 4% monthly logo churn. 62% of customers came from one HVAC trade association partnership.

Go-to-market: Trade association partnerships, Facebook ads, and referrals from existing users.

Competition: QuickBooks, Jobber, Housecall Pro. We are 5x faster to create an invoice.

Team: CEO (ex-HVAC owner), CTO (ex-Square), 4 engineers.

Ask: Raising $2.5M seed to expand to plumbing and electrical.`

export const SAMPLE_CONTEXT = 'Founder ran an HVAC company for 9 years. Solo-founder CEO + technical cofounder who joined 6 months ago. No paid acquisition spend tracked yet.'
