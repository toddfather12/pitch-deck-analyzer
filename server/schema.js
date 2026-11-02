// JSON Schema for Claude's structured output (output_config.format).
// Structured outputs guarantees the response parses and matches this shape,
// so the UI never has to defend against malformed JSON.

export const DIMENSIONS = [
  { id: 'customer', name: 'Problem & Customer Fit' },
  { id: 'revenue_model', name: 'Revenue Model' },
  { id: 'unit_economics', name: 'Unit Economics' },
  { id: 'go_to_market', name: 'Go-to-Market' },
  { id: 'traction', name: 'Traction & Evidence' },
  { id: 'moat', name: 'Defensibility & Moat' },
  { id: 'scalability', name: 'Scalability' },
  { id: 'team', name: 'Team & Execution' },
]

const str = (description) => ({ type: 'string', description })
const strList = (description) => ({ type: 'array', items: { type: 'string' }, description })

const issue = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'detail', 'evidence'],
  properties: {
    title: str('Short headline, max ~10 words.'),
    detail: str('2-3 sentences: what the problem is and why it matters to the business model.'),
    evidence: str('What in the deck/context supports this, or "Not addressed in the deck".'),
  },
}

export const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'businessModelSummary',
    'stage',
    'dimensions',
    'tier1Issues',
    'tier2Issues',
    'conversationPrompts',
    'competitiveAdvantages',
    'keyAssumptions',
    'redFlags',
    'missingInformation',
    'convictionLevel',
    'vertical',
    'strengths',
    'stageReadiness',
    'verticalMetrics',
    'verticalRisks',
    'founderNextSteps',
    'calibratingStatement',
  ],
  properties: {
    businessModelSummary: str(
      'Plain-English summary: who pays, for what, how the company makes money, and how it grows. 3-5 sentences.',
    ),
    stage: {
      type: 'string',
      enum: ['idea', 'pre-seed', 'seed', 'series-a', 'series-b-plus', 'unclear'],
      description: 'Stage the company appears to be at, judged by evidence of traction, not by what the deck claims.',
    },
    dimensions: {
      type: 'array',
      description: 'Exactly one entry for each of the 8 dimension ids, in the order given in the instructions.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'score', 'assessment', 'gaps'],
        properties: {
          id: { type: 'string', enum: DIMENSIONS.map((d) => d.id) },
          score: {
            type: 'integer',
            enum: [1, 2, 3, 4, 5],
            description: '1 = absent/broken, 3 = plausible but unproven, 5 = strong and evidenced.',
          },
          assessment: str('2-3 sentences grounded in the material provided.'),
          gaps: strList('Specific unanswered questions for this dimension. Empty array if none.'),
        },
      },
    },
    tier1Issues: {
      type: 'array',
      description: 'Deal-breaker problems: if unresolved, the business model does not work. Empty array if none.',
      items: issue,
    },
    tier2Issues: {
      type: 'array',
      description: 'Worth exploring: real concerns that are not fatal on their own.',
      items: issue,
    },
    conversationPrompts: {
      type: 'array',
      description: 'Questions to ask the founders, most important first.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'why'],
        properties: {
          question: str('A specific, open-ended question phrased the way a mentor would ask it.'),
          why: str('What the answer would reveal, in one sentence.'),
        },
      },
    },
    competitiveAdvantages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['advantage', 'durability', 'note'],
        properties: {
          advantage: str('The claimed or apparent advantage.'),
          durability: { type: 'string', enum: ['weak', 'moderate', 'strong'] },
          note: str('Why you rated the durability that way, one or two sentences.'),
        },
      },
    },
    keyAssumptions: {
      type: 'array',
      description: 'Assumptions the business model depends on that the deck does not prove.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['assumption', 'howToTest'],
        properties: {
          assumption: str('The assumption, stated plainly.'),
          howToTest: str('The cheapest way the founders could test it.'),
        },
      },
    },
    redFlags: strList('Short statements. Only genuine warning signs; empty array if none.'),
    missingInformation: strList('Important facts a reviewer would want that the material does not contain.'),
    convictionLevel: {
      type: 'object',
      additionalProperties: false,
      required: ['level', 'rationale'],
      properties: {
        level: { type: 'string', enum: ['low', 'medium', 'high'] },
        rationale: str('2-3 sentences explaining the level and what would raise it.'),
      },
    },
    vertical: str('The industry vertical you applied, as a short label (e.g. "Fintech"). Infer it if none was specified.'),
    strengths: {
      type: 'array',
      description: '2-4 genuine, specific strengths. Cite evidence from the material; no generic praise.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'evidence'],
        properties: {
          title: str('Short headline.'),
          evidence: str('The specific evidence from the deck or context.'),
        },
      },
    },
    stageReadiness: {
      type: 'array',
      description: 'The stage criteria you were given, each judged against the material. Use the criteria text verbatim.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['criterion', 'status', 'note'],
        properties: {
          criterion: str('The stage criterion.'),
          status: { type: 'string', enum: ['met', 'partial', 'missing'] },
          note: str('One or two sentences of evidence or what is missing.'),
        },
      },
    },
    verticalMetrics: {
      type: 'array',
      description: 'The metrics that matter most in this vertical, and what the material says about each.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['metric', 'reported', 'benchmark', 'assessment'],
        properties: {
          metric: str('Metric name.'),
          reported: str('What the deck reports, quoted or paraphrased, or "Not provided".'),
          benchmark: str('A rough rule of thumb for what is typical at this stage, or "No reliable benchmark". Never present a rule of thumb as a fact about this company.'),
          assessment: { type: 'string', enum: ['strong', 'ok', 'weak', 'unknown'] },
        },
      },
    },
    verticalRisks: strList('Risks specific to this vertical that the deck does or does not address (regulatory, platform dependency, capital intensity, etc.).'),
    founderNextSteps: {
      type: 'array',
      description: '3-5 concrete, time-bound actions before the next review.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['action', 'timeframe'],
        properties: {
          action: str('A specific action, not generic advice.'),
          timeframe: str('e.g. "2 weeks", "30 days".'),
        },
      },
    },
    calibratingStatement: str('One honest, direct sentence capturing the overall signal. Do not default to encouragement if the model has fundamental problems.'),
  },
}
