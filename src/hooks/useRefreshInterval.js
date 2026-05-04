import { useEffect, useState } from 'react'
import { getRefreshIntervalMs } from '../utils/preferences'

/**
 * Returns the current auto-refresh interval (ms) and stays in sync
 * with the `wws:preferences-changed` custom event dispatched by the
 * preferences page.
 */
export default function useRefreshInterval() {
  const [intervalMs, setIntervalMs] = useState(() => getRefreshIntervalMs())

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const onChange = () => {
      setIntervalMs(getRefreshIntervalMs())
    }

    const onStorage = (event) => {
      if (event.key === 'wws.preferences') onChange()
    }

    window.addEventListener('wws:preferences-changed', onChange)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('wws:preferences-changed', onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return intervalMs
}
