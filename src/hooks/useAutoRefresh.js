import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Periodically invokes `fn` every `intervalMs` milliseconds.
 * Pauses automatically when the tab is hidden and resumes when visible.
 */
export default function useAutoRefresh(fn, intervalMs = 30000, deps = []) {
  const fnRef = useRef(fn)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const refresh = useCallback(() => {
    setTick((t) => t + 1)
    fnRef.current?.()
  }, [])

  useEffect(() => {
    let id = null
    const start = () => {
      stop()
      id = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fnRef.current?.()
          setTick((t) => t + 1)
        }
      }, intervalMs)
    }
    const stop = () => {
      if (id) clearInterval(id)
      id = null
    }
    start()
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fnRef.current?.()
        setTick((t) => t + 1)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])

  return { refresh, tick }
}
