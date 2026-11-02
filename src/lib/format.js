// Turn an analysis into Markdown for copying into notes/email.
export function toMarkdown(a) {
  const list = (items, fn) => (items.length ? items.map(fn).join('\n') : '_None identified._')
  return `# Business Model Analysis

**Stage:** ${a.stage} · **Vertical:** ${a.vertical} · **Conviction:** ${a.convictionLevel.level}
${a.convictionLevel.rationale}

> ${a.calibratingStatement}

## Summary
${a.businessModelSummary}

## Strengths
${list(a.strengths, (x) => `- **${x.title}** - ${x.evidence}`)}

## Dimensions
${a.dimensions.map((d) => `- **${d.name}** (${d.score}/5): ${d.assessment}`).join('\n')}

## Tier 1 issues (deal-breakers)
${list(a.tier1Issues, (i) => `- **${i.title}** - ${i.detail}`)}

## Tier 2 issues (worth exploring)
${list(a.tier2Issues, (i) => `- **${i.title}** - ${i.detail}`)}

## Stage readiness
${list(a.stageReadiness, (c) => `- [${c.status}] ${c.criterion} - ${c.note}`)}

## Vertical lens: ${a.vertical}
${list(a.verticalMetrics, (m) => `- **${m.metric}** (${m.assessment}): ${m.reported} _(rule of thumb: ${m.benchmark})_`)}
${a.verticalRisks.map((r) => `- Risk: ${r}`).join('\n')}

## Conversation prompts
${list(a.conversationPrompts, (p, n) => `${n + 1}. ${p.question} _(${p.why})_`)}

## Founder next steps
${list(a.founderNextSteps, (x, n) => `${n + 1}. ${x.action} _(${x.timeframe})_`)}

## Competitive advantages
${list(a.competitiveAdvantages, (c) => `- **${c.advantage}** [${c.durability}] - ${c.note}`)}

## Key assumptions
${list(a.keyAssumptions, (k) => `- ${k.assumption} → test: ${k.howToTest}`)}

## Red flags
${list(a.redFlags, (r) => `- ${r}`)}

## Missing information
${list(a.missingInformation, (m) => `- ${m}`)}
`
}
