import { useEffect, useState } from 'react'

/**
 * Rerenders every `ms` milliseconds so that relative-time labels
 * (e.g. "updated 12s ago") stay fresh without needing data reloads.
 */
export default function useNowTicker(ms = 1000) {
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
}
