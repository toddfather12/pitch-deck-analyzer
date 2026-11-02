import { useId, useState } from 'react'
import { Loader2, Sparkles, Wand2, X, Zap, Microscope, KeyRound } from 'lucide-react'
import { MODES, SAMPLE_CONTEXT, SAMPLE_DECK } from '../lib/prompts.js'
import { AUDIENCES, STAGES, VERTICALS } from '../../shared/lenses.js'
import FileDropzone from './FileDropzone.jsx'

const DEFAULT_CONFIG = {
  limits: { minDeck: 50, maxDeck: 60000, maxContext: 5000, maxVerticalCustom: 80 },
  maxUploadMb: 4,
  accept: ['.pdf', '.pptx', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp'],
}

const field =
  'w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60'

export default function AnalysisForm({ onSubmit, onCancel, loading, elapsed, config, accessCode, setAccessCode }) {
  const limits = config?.limits ?? DEFAULT_CONFIG.limits
  const maxMb = config?.maxUploadMb ?? DEFAULT_CONFIG.maxUploadMb
  const accept = config?.accept ?? DEFAULT_CONFIG.accept
  const id = useId()

  const [file, setFile] = useState(null)
  const [deck, setDeck] = useState('')
  const [context, setContext] = useState('')
  const [mode, setMode] = useState('quick')
  const [audience, setAudience] = useState('accelerator')
  const [stage, setStage] = useState('auto')
  const [vertical, setVertical] = useState('auto')
  const [verticalCustom, setVerticalCustom] = useState('')

  const tooShort = !file && deck.trim().length < limits.minDeck
  const tooLong = deck.length > limits.maxDeck
  const ctxTooLong = context.length > limits.maxContext
  const needsCustom = vertical === 'other' && !verticalCustom.trim()
  const needsCode = config?.requiresAccessCode && !accessCode
  const disabled = loading || tooShort || tooLong || ctxTooLong || needsCustom || needsCode

  const submit = (e) => {
    e.preventDefault()
    if (!disabled) onSubmit({ deck, context, mode, audience, stage, vertical, verticalCustom, file })
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-line bg-panel p-5 sm:p-6">
      {/* ---- Deck: file or pasted text ---- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-200">Pitch deck</span>
          <button
            type="button"
            onClick={() => { setFile(null); setDeck(SAMPLE_DECK); setContext(SAMPLE_CONTEXT) }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200 disabled:opacity-50"
          >
            <Wand2 size={13} aria-hidden /> Load sample
          </button>
        </div>

        <FileDropzone file={file} onChange={setFile} accept={accept} maxMb={maxMb} disabled={loading} />

        <div className="flex items-center gap-3 text-xs text-zinc-600" aria-hidden>
          <span className="h-px flex-1 bg-line" /> {file ? 'add notes (optional)' : 'or paste the text'} <span className="h-px flex-1 bg-line" />
        </div>

        <div>
          <label htmlFor={`${id}-deck`} className="sr-only">Pitch deck text</label>
          <textarea
            id={`${id}-deck`}
            value={deck}
            onChange={(e) => setDeck(e.target.value)}
            rows={file ? 3 : 9}
            placeholder={file ? 'Anything to add that is not in the file (optional)…' : 'Paste the text from each slide: problem, solution, market, business model, traction, team, ask…'}
            aria-describedby={`${id}-deck-hint`}
            aria-invalid={tooLong}
            disabled={loading}
            className={`${field} resize-y leading-relaxed`}
          />
          <p id={`${id}-deck-hint`} className={`mt-1.5 text-xs ${tooLong ? 'text-red-400' : 'text-zinc-500'}`}>
            {deck.length.toLocaleString()} / {limits.maxDeck.toLocaleString()} characters
            {!file && deck.length > 0 && tooShort ? ` · add at least ${limits.minDeck} characters or upload a file` : ''}
          </p>
        </div>
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
          className={`${field} resize-y leading-relaxed`}
        />
        {ctxTooLong && <p className="mt-1.5 text-xs text-red-400">Context is limited to {limits.maxContext.toLocaleString()} characters.</p>}
      </div>

      {/* ---- Lenses ---- */}
      <fieldset disabled={loading} className="space-y-4 disabled:opacity-60">
        <legend className="mb-3 text-sm font-medium text-zinc-200">Analysis lens</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-stage`} className="mb-1.5 block text-xs text-zinc-400">Stage</label>
            <select id={`${id}-stage`} value={stage} onChange={(e) => setStage(e.target.value)} className={field}>
              <option value="auto">Auto-detect from the deck</option>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-vertical`} className="mb-1.5 block text-xs text-zinc-400">Vertical / industry</label>
            <select id={`${id}-vertical`} value={vertical} onChange={(e) => setVertical(e.target.value)} className={field}>
              <option value="auto">Auto-detect from the deck</option>
              {VERTICALS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              <option value="other">Other (describe)…</option>
            </select>
          </div>
        </div>
        {vertical === 'other' && (
          <div>
            <label htmlFor={`${id}-vc`} className="mb-1.5 block text-xs text-zinc-400">Describe the industry</label>
            <input id={`${id}-vc`} value={verticalCustom} maxLength={limits.maxVerticalCustom} onChange={(e) => setVerticalCustom(e.target.value)}
              placeholder="e.g. Space tourism, pet insurance, legal tech" className={field} />
          </div>
        )}
        <p className="text-xs text-zinc-500">
          {stage === 'auto' ? 'The stage is judged from the evidence in the deck.' : `Judged against what is reasonable for ${STAGES.find((s) => s.id === stage)?.label}.`}{' '}
          {vertical === 'auto' ? 'The industry is inferred, then its key metrics and risks are applied.' : 'Industry-specific metrics and risks are applied.'}
        </p>
      </fieldset>

      <fieldset disabled={loading} className="grid gap-5 sm:grid-cols-2 disabled:opacity-60">
        <div>
          <span id={`${id}-aud-label`} className="mb-2 block text-sm font-medium text-zinc-200">Audience</span>
          <div role="radiogroup" aria-labelledby={`${id}-aud-label`} className="grid grid-cols-2 gap-2">
            {AUDIENCES.map((a) => (
              <label key={a.id} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500/50 ${
                audience === a.id ? 'border-violet-500 bg-violet-500/10 text-zinc-100' : 'border-line text-zinc-400 hover:border-zinc-600'}`}>
                <input type="radio" name={`${id}-aud`} value={a.id} checked={audience === a.id} onChange={() => setAudience(a.id)} className="sr-only" />
                <span className="block font-medium">{a.label}</span>
                <span className="mt-0.5 block text-zinc-500">{a.blurb}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <span id={`${id}-depth-label`} className="mb-2 block text-sm font-medium text-zinc-200">Depth</span>
          <div role="radiogroup" aria-labelledby={`${id}-depth-label`} className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const Icon = m.id === 'quick' ? Zap : Microscope
              const active = mode === m.id
              return (
                <label key={m.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500/50 ${
                  active ? 'border-violet-500 bg-violet-500/10' : 'border-line hover:border-zinc-600'}`}>
                  <input type="radio" name={`${id}-mode`} value={m.id} checked={active} onChange={() => setMode(m.id)} className="sr-only" />
                  <Icon size={15} className={`mt-0.5 shrink-0 ${active ? 'text-violet-300' : 'text-zinc-500'}`} aria-hidden />
                  <span className="text-xs">
                    <span className="block font-medium text-zinc-100">{m.label} <span className="font-normal text-zinc-500">{m.time}</span></span>
                    <span className="block text-zinc-500">{m.blurb}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </fieldset>

      {config?.requiresAccessCode && (
        <div>
          <label htmlFor={`${id}-code`} className="mb-2 flex items-center gap-1.5 text-sm font-medium text-zinc-200">
            <KeyRound size={14} aria-hidden /> Access code
          </label>
          <input id={`${id}-code`} type="password" autoComplete="off" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} className={`${field} sm:w-72`} />
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
        {loading && file && <span className="text-xs text-zinc-500">Reading {file.name}…</span>}
      </div>
    </form>
  )
}
