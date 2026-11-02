// Turn an analysis into Markdown for copying into notes/email.
export function toMarkdown(a) {
  const list = (items, fn) => (items.length ? items.map(fn).join('\n') : '_None identified._')
  return `# Business Model Analysis

**Stage:** ${a.stage} · **Conviction:** ${a.convictionLevel.level}
${a.convictionLevel.rationale}

## Summary
${a.businessModelSummary}

## Dimensions
${a.dimensions.map((d) => `- **${d.name}** (${d.score}/5): ${d.assessment}`).join('\n')}

## Tier 1 issues (deal-breakers)
${list(a.tier1Issues, (i) => `- **${i.title}** - ${i.detail}`)}

## Tier 2 issues (worth exploring)
${list(a.tier2Issues, (i) => `- **${i.title}** - ${i.detail}`)}

## Conversation prompts
${list(a.conversationPrompts, (p, n) => `${n + 1}. ${p.question} _(${p.why})_`)}

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
