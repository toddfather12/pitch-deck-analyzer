// Pure data shared by the server (prompt building) and the browser (dropdown options).
// Benchmarks are deliberately phrased as rules of thumb: the prompt tells the model
// to treat them as guidance, never as pass/fail thresholds or facts about the company.

export const STAGES = [
  {
    id: 'idea',
    label: 'Idea / concept',
    focus: 'Is the problem real and is the customer specific? Revenue is NOT expected; hold the standard on problem/customer evidence.',
    criteria: [
      'Specific customer segment defined (not "SMBs" or "millennials")',
      'Problem validated through direct customer conversations, not secondary research',
      'Customer describes the pain in their own words',
      'Current alternatives / workarounds identified',
      'Riskiest assumptions named and a plan to test them',
      'Founder-problem fit or credible reason to be the one solving it',
    ],
    pitfalls: 'Building before talking to customers; TAM-only reasoning; solution looking for a problem; pricing copied from a comparable.',
  },
  {
    id: 'pre-seed',
    label: 'Pre-seed / MVP',
    focus: 'Is there early proof people want it and will pay? Look for prototypes in real hands, pilots, LOIs, first revenue.',
    criteria: [
      'Working prototype or MVP used by real users',
      'Evidence of willingness to pay (pre-orders, LOIs, paid pilots, first revenue)',
      'Clear beachhead customer and first channel for the next 90 days',
      'Early usage or engagement data beyond vanity metrics',
      'Pricing hypothesis tested with at least a few real customers',
      'Founding team can build and sell this (skills coverage)',
    ],
    pitfalls: 'Vanity metrics (downloads, waitlist); free pilots mistaken for demand; no beachhead; scaling plans before the model is proven.',
  },
  {
    id: 'seed',
    label: 'Seed',
    focus: 'Is there a repeatable early engine? Look for product in market, retention, early unit economics, and one or two channels that work.',
    criteria: [
      'Paying customers or strong engagement with retention evidence (cohorts, not just totals)',
      'Revenue growth trend over several months, not a single spike',
      'At least one acquisition channel showing repeatable results, with CAC visible',
      'Early unit economics (gross margin, payback) understood and trending sensibly',
      'Customer concentration and dependence on any single partner understood',
      'Credible plan and milestones for the next 18-24 months of runway',
    ],
    pitfalls: 'Growth from founder network only; one customer or partner driving most revenue; churn hidden by blended numbers; no CAC by channel.',
  },
  {
    id: 'series-a',
    label: 'Series A',
    focus: 'Is the go-to-market repeatable and are the unit economics proven? Look for scalable growth, efficiency, and a team beyond the founders.',
    criteria: [
      'Meaningful, growing recurring revenue with consistent month-over-month growth',
      'Proven unit economics (LTV:CAC, CAC payback, gross margin at current scale)',
      'Retention and expansion evidence (net revenue retention or equivalent)',
      'Repeatable, documented sales/marketing motion that is not founder-dependent',
      'Defined ideal customer profile and expansion path within it',
      'Hiring plan and first layer of leadership beyond founders',
    ],
    pitfalls: 'Founder-led sales presented as a repeatable motion; blended CAC masking paid-channel decay; weak retention hidden by new-logo growth.',
  },
  {
    id: 'series-b-plus',
    label: 'Series B and later',
    focus: 'Is it a scaling machine with defensible efficiency? Look for sales efficiency, segment expansion, leadership depth, and a path to profitability or category leadership.',
    criteria: [
      'Efficient growth (burn multiple, magic number, or comparable efficiency measure)',
      'Multiple repeatable channels or segments, not one engine',
      'Net revenue retention and expansion at scale',
      'Defensibility that strengthens with scale (data, network, switching costs, brand)',
      'Leadership bench and operating cadence for a larger organization',
      'Clear path to profitability or durable category leadership',
    ],
    pitfalls: 'Growth bought with unsustainable burn; margin erosion at scale; new-market expansion before the core is efficient; dependence on one channel.',
  },
]

export const VERTICALS = [
  {
    id: 'saas',
    label: 'B2B SaaS',
    metrics: ['ARR / MRR and growth rate', 'Net revenue retention', 'Gross margin', 'CAC payback', 'ACV and sales cycle length', 'Logo churn'],
    risks: 'Seat-based pricing with no expansion path; long enterprise sales cycles; heavy integration or security/compliance requirements (e.g. SOC 2); crowded category with bundling incumbents.',
  },
  {
    id: 'ai',
    label: 'AI / ML',
    metrics: ['Gross margin after inference cost', 'Accuracy / quality vs. a stated baseline', 'Usage retention', 'Cost per task or per customer', 'Proprietary data advantage'],
    risks: 'Thin wrapper on a foundation model that incumbents or the model provider can replicate; inference costs eroding margin; no proprietary data or workflow lock-in; reliability and evaluation not demonstrated; model-provider dependency.',
  },
  {
    id: 'devtools',
    label: 'Developer tools / infrastructure',
    metrics: ['Active developers / teams', 'Free-to-paid conversion', 'Usage-based revenue growth', 'Net revenue retention', 'Community or open-source adoption'],
    risks: 'Monetization of an open-source or free tier; bottom-up adoption that never converts to enterprise contracts; platform dependency; commoditization by cloud providers.',
  },
  {
    id: 'fintech',
    label: 'Fintech',
    metrics: ['Total payment volume or assets/loans managed', 'Take rate / net revenue margin', 'Loss or fraud rate', 'CAC and payback', 'Cost of capital (for lending)'],
    risks: 'Licensing and regulatory exposure; dependence on a single partner bank or processor; fraud and credit losses; interchange or rate changes; compliance cost at scale.',
  },
  {
    id: 'healthtech',
    label: 'Healthtech / digital health',
    metrics: ['Who pays (payer, provider, employer, patient) and reimbursement status', 'Clinical or outcomes evidence', 'Sales cycle with health systems', 'Engagement and retention', 'Revenue per covered life or per site'],
    risks: 'Misaligned payer vs. user; long health-system procurement cycles; reimbursement uncertainty; HIPAA and data privacy; FDA or clinical-validation requirements.',
  },
  {
    id: 'biotech',
    label: 'Biotech / life sciences',
    metrics: ['Pipeline stage and next milestone', 'IP position and freedom to operate', 'Regulatory pathway and timeline', 'Cash runway to next value-inflection milestone', 'Partnering or licensing interest'],
    risks: 'Binary clinical or regulatory outcomes; capital needs far beyond this round; weak IP; long timelines to revenue; reliance on a single asset.',
  },
  {
    id: 'consumer',
    label: 'Consumer / D2C / e-commerce',
    metrics: ['Contribution margin after fulfillment and returns', 'CAC and blended vs. paid CAC', 'Repeat purchase rate and cohort retention', 'Average order value', 'Channel mix (share from paid social)'],
    risks: 'Dependence on paid social with rising CAC; low repeat purchase; inventory and working-capital risk; weak brand defensibility; marketplace/retailer concentration.',
  },
  {
    id: 'marketplace',
    label: 'Marketplace / platform',
    metrics: ['Liquidity (match or fill rate)', 'Take rate', 'Supply-side and demand-side growth', 'Repeat usage and cohort retention', 'Disintermediation or leakage rate'],
    risks: 'Cold-start problem on one side; users transacting off-platform after first match; low-frequency use; supply quality control; high CAC on both sides.',
  },
  {
    id: 'social',
    label: 'Consumer social / media / gaming',
    metrics: ['DAU/MAU and retention curves (D1/D7/D30)', 'Viral coefficient or organic share of installs', 'ARPU / monetization rate', 'Time spent', 'Content or creator supply'],
    risks: 'Monetization deferred indefinitely; dependence on app-store or social-platform distribution; retention cliff after launch; hit-driven revenue.',
  },
  {
    id: 'climate',
    label: 'Climate / energy',
    metrics: ['Unit cost vs. incumbent (cost parity path)', 'Offtake agreements or signed customers', 'Capex per unit and financing structure', 'Policy or subsidy dependence', 'Deployment pipeline'],
    risks: 'Economics that only work with subsidies; capital intensity and project-finance needs; long deployment and permitting cycles; unproven scale-up from pilot to commercial.',
  },
  {
    id: 'deeptech',
    label: 'Deep tech / hardware / robotics',
    metrics: ['Technology readiness level and next technical milestone', 'Bill-of-materials and gross margin at volume', 'Pilot customers or design wins', 'Manufacturing plan and supply chain', 'Certification requirements'],
    risks: 'Technical risk unresolved; manufacturing scale-up; long sales and qualification cycles; capital intensity; hardware margins and inventory.',
  },
  {
    id: 'edtech',
    label: 'Edtech',
    metrics: ['Who buys vs. who uses (district, school, parent, learner, employer)', 'Efficacy or learning-outcome evidence', 'Engagement and completion rates', 'Procurement cycle and seasonality', 'Renewal rate'],
    risks: 'Buyer differs from user; slow, seasonal public-sector procurement; weak efficacy evidence; low engagement; free alternatives.',
  },
  {
    id: 'proptech',
    label: 'Proptech / real estate / construction',
    metrics: ['Revenue mix (software vs. transaction vs. financing)', 'Customer concentration', 'Sensitivity to interest rates and cycles', 'Adoption within a fragmented customer base', 'Regulatory or licensing exposure'],
    risks: 'Cyclicality; slow-adopting fragmented customers; transaction revenue that disappears in downturns; local regulation.',
  },
  {
    id: 'logistics',
    label: 'Logistics / supply chain / mobility',
    metrics: ['Gross margin per shipment/trip/unit', 'Asset-light vs. asset-heavy structure', 'Network density and utilization', 'Customer concentration', 'On-time or reliability performance'],
    risks: 'Thin margins; capital intensity of owned assets; customer concentration; incumbents with scale advantages; fuel and labor volatility.',
  },
  {
    id: 'foodag',
    label: 'Food / agriculture',
    metrics: ['Gross margin and cost vs. conventional alternative', 'Retail velocity or offtake commitments', 'Yield or production-cost improvements', 'Seasonality and working capital', 'Distribution partners'],
    risks: 'Commodity price exposure; seasonality and working-capital needs; slow farmer or retailer adoption; thin margins and distributor power.',
  },
]

export const AUDIENCES = [
  { id: 'accelerator', label: 'Accelerator / real venture', blurb: 'Direct, investor-readiness focus.' },
  { id: 'classroom', label: 'Classroom', blurb: 'Developmental, learning-focused.' },
]

export const STAGE_IDS = STAGES.map((s) => s.id)
export const VERTICAL_IDS = VERTICALS.map((v) => v.id)
