import { useState } from 'react'
import {
  AlertOctagon, AlertTriangle, Check, ClipboardCopy, Download, Flag, FlaskConical, Gauge,
  HelpCircle, MessageCircleQuestion, Shield, Layers, FileQuestion, RotateCcw,
  ThumbsUp, ListChecks, Factory, Target, Info,
} from 'lucide-react'
import Section, { Empty } from './Section.jsx'
import { toMarkdown } from '../lib/format.js'

const CONVICTION = {
  low: 'border-red-500/40 bg-red-500/10 text-red-300',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  high: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
}
const DURABILITY = { weak: 'text-red-300', moderate: 'text-amber-300', strong: 'text-emerald-300' }
const STATUS = {
  met: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  partial: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  missing: 'border-red-500/40 bg-red-500/10 text-red-300',
}
const ASSESS = {
  strong: 'text-emerald-300', ok: 'text-zinc-300', weak: 'text-red-300', unknown: 'text-zinc-500',
}
const scoreColor = (s) => (s >= 4 ? 'bg-emerald-500' : s === 3 ? 'bg-amber-500' : 'bg-red-500')

function IssueList({ items, tone }) {
  if (!items.length) return <Empty />
  return (
    <ul className="space-y-4">
      {items.map((i, n) => (
        <li key={n} className="text-sm">
          <p className={`font-medium ${tone}`}>{i.title}</p>
          <p className="mt-1 text-zinc-300">{i.detail}</p>
          <p className="mt-1 text-xs text-zinc-500">Evidence: {i.evidence}</p>
        </li>
      ))}
    </ul>
  )
}

export default function AnalysisResults({ data, onReset }) {
  const { analysis: a, meta } = data
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(a))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable (insecure context); download still works */
    }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: 'pitch-analysis.json' })
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fade-in space-y-4" aria-live="polite">
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${CONVICTION[a.convictionLevel.level]}`}>
            {a.convictionLevel.level} conviction
          </span>
          <span className="rounded-full border border-line px-3 py-1 text-xs capitalize text-zinc-300">Stage: {a.stage.replace(/-/g, ' ')}</span>
          {a.vertical && <span className="rounded-full border border-line px-3 py-1 text-xs text-zinc-300">{a.vertical}</span>}
          <div className="ml-auto flex gap-2">
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
              {copied ? <Check size={13} aria-hidden /> : <ClipboardCopy size={13} aria-hidden />} {copied ? 'Copied' : 'Copy Markdown'}
            </button>
            <button onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
              <Download size={13} aria-hidden /> JSON
            </button>
            <button onClick={onReset} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
              <RotateCcw size={13} aria-hidden /> New
            </button>
          </div>
        </div>
        <h2 className="mt-4 text-sm font-semibold text-zinc-100">Business model summary</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">{a.businessModelSummary}</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{a.convictionLevel.rationale}</p>
        {a.calibratingStatement && (
          <p className="mt-4 border-l-2 border-violet-500 pl-3 text-sm font-medium leading-relaxed text-zinc-100">{a.calibratingStatement}</p>
        )}
      </div>

      {meta.notes?.map((n, i) => (
        <div key={i} role="note" className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-amber-200">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden /> <p>{n}</p>
        </div>
      ))}

      <Section title="Strengths" icon={ThumbsUp} tone="good" count={a.strengths.length}>
        {a.strengths.length ? (
          <ul className="space-y-3 text-sm">
            {a.strengths.map((x, n) => (
              <li key={n}>
                <p className="font-medium text-emerald-300">{x.title}</p>
                <p className="mt-0.5 text-zinc-300">{x.evidence}</p>
              </li>
            ))}
          </ul>
        ) : <Empty>No clear strengths identified from this material.</Empty>}
      </Section>

      <Section title="Business model dimensions" icon={Layers} tone="info" count={a.dimensions.length}>
        <ul className="grid gap-5 md:grid-cols-2">
          {a.dimensions.map((d) => (
            <li key={d.id} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-zinc-100">{d.name}</span>
                <span className="tabular-nums text-xs text-zinc-400">{d.score}/5</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800" role="img" aria-label={`${d.name} score ${d.score} out of 5`}>
                <div className={`h-full rounded-full ${scoreColor(d.score)}`} style={{ width: `${d.score * 20}%` }} />
              </div>
              <p className="mt-2 text-zinc-300">{d.assessment}</p>
              {d.gaps.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-zinc-500">
                  {d.gaps.map((g, n) => <li key={n}>{g}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tier 1 issues · deal-breakers" icon={AlertOctagon} tone="danger" count={a.tier1Issues.length}>
        <IssueList items={a.tier1Issues} tone="text-red-300" />
      </Section>
      <Section title="Tier 2 issues · worth exploring" icon={AlertTriangle} tone="warn" count={a.tier2Issues.length}>
        <IssueList items={a.tier2Issues} tone="text-amber-300" />
      </Section>

      <Section
        title={`Stage readiness · ${a.stage.replace(/-/g, ' ')}${meta.stageSelected !== 'auto' && meta.stageSelected !== a.stage ? ` (you selected ${meta.stageSelected.replace(/-/g, ' ')})` : ''}`}
        icon={ListChecks} tone="info" count={a.stageReadiness.length}
      >
        {a.stageReadiness.length ? (
          <ul className="space-y-3">
            {a.stageReadiness.map((c, n) => (
              <li key={n} className="flex gap-3 text-sm">
                <span className={`mt-0.5 h-fit shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS[c.status]}`}>{c.status}</span>
                <span><span className="text-zinc-100">{c.criterion}</span><span className="mt-0.5 block text-zinc-400">{c.note}</span></span>
              </li>
            ))}
          </ul>
        ) : <Empty />}
      </Section>

      <Section title={`Vertical lens${a.vertical ? ` · ${a.vertical}` : ''}`} icon={Factory} tone="info" count={a.verticalMetrics.length + a.verticalRisks.length}>
        {a.verticalMetrics.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr><th className="pb-2 pr-3 font-medium">Metric</th><th className="pb-2 pr-3 font-medium">Reported</th><th className="pb-2 pr-3 font-medium">Rule of thumb</th><th className="pb-2 font-medium">Read</th></tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {a.verticalMetrics.map((m, n) => (
                  <tr key={n}>
                    <td className="py-2.5 pr-3 font-medium text-zinc-100">{m.metric}</td>
                    <td className="py-2.5 pr-3 text-zinc-300">{m.reported}</td>
                    <td className="py-2.5 pr-3 text-zinc-500">{m.benchmark}</td>
                    <td className={`py-2.5 text-xs font-semibold uppercase tracking-wide ${ASSESS[m.assessment]}`}>{m.assessment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {a.verticalRisks.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Vertical-specific risks</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-300 marker:text-amber-400">
              {a.verticalRisks.map((r, n) => <li key={n}>{r}</li>)}
            </ul>
          </>
        )}
        {!a.verticalMetrics.length && !a.verticalRisks.length && <Empty />}
        <p className="mt-4 text-xs text-zinc-600">Rules of thumb are rough and vary by market and year; they are not thresholds.</p>
      </Section>

      <Section title="Conversation prompts for the founders" icon={MessageCircleQuestion} tone="info" count={a.conversationPrompts.length}>
        {a.conversationPrompts.length ? (
          <ol className="list-decimal space-y-3 pl-5 text-sm marker:text-zinc-500">
            {a.conversationPrompts.map((p, n) => (
              <li key={n}>
                <p className="text-zinc-100">{p.question}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{p.why}</p>
              </li>
            ))}
          </ol>
        ) : <Empty />}
      </Section>

      <Section title="Founder next steps" icon={Target} tone="good" count={a.founderNextSteps.length}>
        {a.founderNextSteps.length ? (
          <ol className="list-decimal space-y-2.5 pl-5 text-sm marker:text-zinc-500">
            {a.founderNextSteps.map((x, n) => (
              <li key={n} className="text-zinc-200">{x.action} <span className="ml-1 whitespace-nowrap rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{x.timeframe}</span></li>
            ))}
          </ol>
        ) : <Empty />}
      </Section>

      <Section title="Competitive advantages" icon={Shield} tone="good" count={a.competitiveAdvantages.length}>
        {a.competitiveAdvantages.length ? (
          <ul className="space-y-3">
            {a.competitiveAdvantages.map((c, n) => (
              <li key={n} className="text-sm">
                <span className="font-medium text-zinc-100">{c.advantage}</span>{' '}
                <span className={`text-xs uppercase tracking-wide ${DURABILITY[c.durability]}`}>{c.durability}</span>
                <p className="mt-0.5 text-zinc-400">{c.note}</p>
              </li>
            ))}
          </ul>
        ) : <Empty>No defensible advantages identified.</Empty>}
      </Section>

      <Section title="Key assumptions" icon={FlaskConical} count={a.keyAssumptions.length} defaultOpen={false}>
        {a.keyAssumptions.length ? (
          <ul className="space-y-3 text-sm">
            {a.keyAssumptions.map((k, n) => (
              <li key={n}>
                <p className="text-zinc-200">{k.assumption}</p>
                <p className="mt-0.5 text-xs text-zinc-500">Test: {k.howToTest}</p>
              </li>
            ))}
          </ul>
        ) : <Empty />}
      </Section>

      <Section title="Red flags" icon={Flag} tone="danger" count={a.redFlags.length} defaultOpen={a.redFlags.length > 0}>
        {a.redFlags.length ? (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-300 marker:text-red-400">
            {a.redFlags.map((r, n) => <li key={n}>{r}</li>)}
          </ul>
        ) : <Empty>No red flags identified.</Empty>}
      </Section>

      <Section title="Missing information" icon={FileQuestion} count={a.missingInformation.length} defaultOpen={false}>
        {a.missingInformation.length ? (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-300">
            {a.missingInformation.map((m, n) => <li key={n}>{m}</li>)}
          </ul>
        ) : <Empty />}
      </Section>

      <p className="flex items-center gap-1.5 px-1 text-xs text-zinc-600">
        <Gauge size={12} aria-hidden /> {meta.mode} · {(meta.ms / 1000).toFixed(1)}s · {meta.model}{meta.file ? ` · ${meta.file.name}` : ''}
        <HelpCircle size={12} className="ml-3" aria-hidden /> AI-generated; verify claims before making decisions.
      </p>
    </div>
  )
}
