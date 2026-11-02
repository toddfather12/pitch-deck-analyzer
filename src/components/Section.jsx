import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const TONES = {
  default: 'text-zinc-400',
  danger: 'text-red-400',
  warn: 'text-amber-400',
  good: 'text-emerald-400',
  info: 'text-violet-300',
}

/** Collapsible card section with proper aria-expanded/controls semantics. */
export default function Section({ title, icon: Icon, count, tone = 'default', defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  return (
    <section className="rounded-2xl border border-line bg-panel">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
        >
          {Icon && <Icon size={18} className={TONES[tone]} aria-hidden />}
          <span className="flex-1 text-sm font-semibold text-zinc-100">{title}</span>
          {count !== undefined && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs tabular-nums text-zinc-400">{count}</span>
          )}
          <ChevronDown size={16} aria-hidden className={`print:hidden text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={panelId} className={`border-t border-line px-5 py-4 ${open ? '' : 'hidden print:block'}`}>
        {children}
      </div>
    </section>
  )
}

export const Empty = ({ children = 'Nothing identified.' }) => <p className="text-sm text-zinc-500">{children}</p>
