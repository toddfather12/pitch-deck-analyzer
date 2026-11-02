import { useId, useRef, useState } from 'react'
import { FileText, FileImage, Presentation, UploadCloud, X } from 'lucide-react'

const iconFor = (name = '') => {
  const ext = name.toLowerCase().split('.').pop()
  if (ext === 'pptx') return Presentation
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return FileImage
  return FileText
}
const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const extOf = (name) => `.${name.toLowerCase().split('.').pop()}`

/** Drag-and-drop or click-to-browse. Validates type and size before anything is uploaded. */
export default function FileDropzone({ file, onChange, accept, maxMb, disabled }) {
  const id = useId()
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const [error, setError] = useState('')

  const take = (f) => {
    if (!f) return
    setError('')
    if (!accept.includes(extOf(f.name))) {
      const legacy = ['.ppt', '.doc', '.key', '.odp', '.pages'].includes(extOf(f.name))
      return setError(legacy ? 'Export it as PDF or PPTX first, then upload that.' : `Unsupported type. Use ${accept.join(', ')}.`)
    }
    if (f.size > maxMb * 1048576) return setError(`That file is ${fmtSize(f.size)}; the limit is ${maxMb} MB.`)
    onChange(f)
  }

  if (file) {
    const Icon = iconFor(file.name)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3.5 py-3">
        <Icon size={20} className="shrink-0 text-violet-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{file.name}</p>
          <p className="text-xs text-zinc-400">{fmtSize(file.size)}</p>
        </div>
        <button type="button" onClick={() => { onChange(null); if (input.current) input.current.value = '' }} disabled={disabled}
          aria-label={`Remove ${file.name}`} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 disabled:opacity-50">
          <X size={16} aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) take(e.dataTransfer.files?.[0]) }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500/50 ${
          over ? 'border-violet-400 bg-violet-500/10' : 'border-zinc-700 hover:border-zinc-500'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <UploadCloud size={22} className="text-zinc-400" aria-hidden />
        <span className="text-sm text-zinc-200"><span className="font-medium text-violet-300">Upload a deck</span> or drag it here</span>
        <span className="text-xs text-zinc-500">PDF, PPTX, DOCX, TXT or image · up to {maxMb} MB</span>
        <input id={id} ref={input} type="file" accept={accept.join(',')} disabled={disabled} className="sr-only"
          onChange={(e) => take(e.target.files?.[0])} />
      </label>
      {error && <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}
