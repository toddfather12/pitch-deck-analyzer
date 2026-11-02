import { useId, useState } from 'react'
import { Loader2, Sparkles, Wand2, X, Zap, Microscope, KeyRound } from 'lucide-react'
import { MODES, SAMPLE_CONTEXT, SAMPLE_DECK } from '../lib/prompts.js'

const DEFAULT_LIMITS = { minDeck: 50, maxDeck: 60000, maxContext: 5000 }

export default function AnalysisForm({ onSubmit, onCancel, loading, elapsed, config, accessCode, setAccessCode }) {
  const limits = config?.limits ?? DEFAULT_LIMITS
  const id = useId()
  const [deck, setDeck] = useState('')
  const [context, setContext] = useState('')
  const [mode, setMode] = useState('quick')

  const tooShort = deck.trim().length < limits.minDeck
  const tooLong = deck.length > limits.maxDeck
  const ctxTooLong = context.length > limits.maxContext
  const needsCode = config?.requiresAccessCode && !accessCode
  const disabled = loading || tooShort || tooLong || ctxTooLong || needsCode

  const submit = (e) => {
    e.preventDefault()
    if (!disabled) onSubmit({ deck, context, mode })
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor={`${id}-deck`} className="text-sm font-medium text-zinc-200">
            Pitch deck content
          </label>
          <button
            type="button"
            onClick={() => { setDeck(SAMPLE_DECK); setContext(SAMPLE_CONTEXT) }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200 disabled:opacity-50"
          >
            <Wand2 size={13} aria-hidden /> Load sample
          </button>
        </div>
        <textarea
          id={`${id}-deck`}
          value={deck}
          onChange={(e) => setDeck(e.target.value)}
          rows={11}
          placeholder="Paste the text from each slide: problem, solution, market, business model, traction, team, ask…"
          aria-describedby={`${id}-deck-hint`}
          aria-invalid={tooLong}
          disabled={loading}
          className="w-full resize-y rounded-xl border border-line bg-ink px-3.5 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
        />
        <p id={`${id}-deck-hint`} className={`mt-1.5 text-xs ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
          {deck.length.toLocaleString()} / {limits.maxDeck.toLocaleString()} characters
          {deck.length > 0 && tooShort ? ` · add at least ${limits.minDeck} characters` : ''}
        </p>
      </div>

      <div>
        <label htmlFor={`${id}-ctx`} className="mb-2 block text-sm font-medium text-zinc-200">
          Extra context <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id={`${id}-ctx`}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder="Founder background, how you met them, traction not in the deck, what you're trying to decide…"
          aria-invalid={ctxTooLong}
          disabled={loading}
          className="w-full resize-y rounded-xl border border-line bg-ink px-3.5 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
        />
        {ctxTooLong && <p className="mt-1.5 text-xs text-red-400">Context is limited to {limits.maxContext.toLocaleString()} characters.</p>}
      </div>

      <fieldset disabled={loading} className="disabled:opacity-60">
        <legend className="mb-2 text-sm font-medium text-zinc-200">Analysis depth</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => {
            const Icon = m.id === 'quick' ? Zap : Microscope
            const active = mode === m.id
            return (
              <label
                key={m.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500/50 ${
                  active ? 'border-violet-500 bg-violet-500/10' : 'border-line hover:border-zinc-600'
                }`}
              >
                <input type="radio" name={`${id}-mode`} value={m.id} checked={active} onChange={() => setMode(m.id)} className="sr-only" />
                <Icon size={18} className={active ? 'mt-0.5 text-violet-300' : 'mt-0.5 text-zinc-500'} aria-hidden />
                <span>
                  <span className="block text-sm font-medium text-zinc-100">
                    {m.label} <span className="font-normal text-zinc-500">· {m.time}</span>
                  </span>
                  <span className="block text-xs text-zinc-400">{m.blurb}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {config?.requiresAccessCode && (
        <div>
          <label htmlFor={`${id}-code`} className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-200">
            <KeyRound size={14} aria-hidden /> Access code
          </label>
          <input
            id={`${id}-code`}
            type="password"
            autoComplete="off"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 sm:w-72"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />}
          {loading ? `Analyzing… ${elapsed}s` : 'Analyze business model'}
        </button>
        {loading && (
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-500">
            <X size={14} aria-hidden /> Cancel
          </button>
        )}
      </div>
    </form>
  )
}
