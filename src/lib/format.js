const today = () => new Date().toISOString().slice(0, 10)

/** e.g. "pitch-analysis-looploader-2026-11-02" - from the uploaded file name when there is one. */
export function exportBaseName(a, meta) {
  const raw = meta?.file?.name?.replace(/\.[^.]+$/, '') || a.vertical || 'report'
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'report'
  return `pitch-analysis-${slug}-${today()}`
}

/** Save text as a file via a temporary link. */
export function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Opens the print dialog (choose "Save as PDF"); the document title becomes the suggested file name. */
export function printReport(name) {
  const prev = document.title
  document.title = name
  window.addEventListener('afterprint', () => { document.title = prev }, { once: true })
  window.print()
}

// Turn an analysis into Markdown for copying into notes/email or saving as a file.
export function toMarkdown(a, meta) {
  const list = (items, fn) => (items.length ? items.map(fn).join('\n') : '_None identified._')
  return `# Business Model Analysis
_Generated ${today()}${meta?.file ? ` from ${meta.file.name}` : ''}_

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
