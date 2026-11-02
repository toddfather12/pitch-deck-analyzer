import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzePitch, ApiError } from '../lib/api.js'

/** Owns the request lifecycle: idle → loading → success | error, with cancel + elapsed timer. */
export function useAnalysis() {
  const [state, setState] = useState({ status: 'idle', result: null, error: null })
  const [elapsed, setElapsed] = useState(0)
  const controller = useRef(null)

  useEffect(() => {
    if (state.status !== 'loading') return
    const start = Date.now()
    setElapsed(0)
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500)
    return () => clearInterval(id)
  }, [state.status])

  useEffect(() => () => controller.current?.abort(), [])

  const run = useCallback(async (input) => {
    controller.current?.abort()
    const ctrl = new AbortController()
    controller.current = ctrl
    setState({ status: 'loading', result: null, error: null })
    try {
      const result = await analyzePitch({ ...input, signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      setState({ status: 'success', result, error: null })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'cancelled') return setState({ status: 'idle', result: null, error: null })
      setState({ status: 'error', result: null, error: err instanceof ApiError ? err : new ApiError('Something went wrong.') })
    }
  }, [])

  const cancel = useCallback(() => controller.current?.abort(), [])
  const reset = useCallback(() => setState({ status: 'idle', result: null, error: null }), [])

  return { ...state, elapsed, run, cancel, reset }
}
