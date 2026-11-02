import { useEffect, useState } from 'react'
import { AlertCircle, BarChart3 } from 'lucide-react'
import AnalysisForm from './components/AnalysisForm.jsx'
import AnalysisResults from './components/AnalysisResults.jsx'
import { useAnalysis } from './hooks/useAnalysis.js'
import { fetchConfig } from './lib/api.js'

const readCode = () => { try { return localStorage.getItem('pda-access-code') ?? '' } catch { return '' } }

export default function App() {
  const { status, result, error, elapsed, run, cancel, reset } = useAnalysis()
  const [config, setConfig] = useState(null)
  const [accessCode, setAccessCodeState] = useState(readCode)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchConfig(ctrl.signal).then(setConfig)
    return () => ctrl.abort()
  }, [])

  const setAccessCode = (v) => {
    setAccessCodeState(v)
    try { localStorage.setItem('pda-access-code', v) } catch { /* private mode */ }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 print:hidden">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-600"><BarChart3 size={18} aria-hidden /></span>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Pitch Deck Analyzer</h1>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Paste a pitch deck and get a mentor-style read on the business model: where it's strong, what could break it, and what to ask the founders.
        </p>
      </header>

      {config && config.configured === false && (
        <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>The server has no <code className="rounded bg-black/30 px-1">ANTHROPIC_API_KEY</code>. Copy <code className="rounded bg-black/30 px-1">.env.example</code> to <code className="rounded bg-black/30 px-1">.env</code> and restart.</p>
        </div>
      )}

      <div className="space-y-6">
        {status !== 'success' && (
          <AnalysisForm
            onSubmit={(input) => run({ ...input, accessCode })}
            onCancel={cancel}
            loading={status === 'loading'}
            elapsed={elapsed}
            config={config}
            accessCode={accessCode}
            setAccessCode={setAccessCode}
          />
        )}

        {status === 'error' && (
          <div role="alert" className="fade-in flex gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Analysis failed</p>
              <p className="mt-0.5 text-red-200/80">{error.message}</p>
            </div>
          </div>
        )}

        {status === 'success' && <AnalysisResults data={result} onReset={reset} />}
      </div>
    </div>
  )
}
