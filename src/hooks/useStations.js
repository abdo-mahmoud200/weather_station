import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchStations, fetchStation } from '../services/api'

export function useStations() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await fetchStations()
      if (!mountedRef.current) return
      setStations(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      if (!mountedRef.current) return
      setError(e)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { stations, loading, error, refresh, lastUpdated, setStations }
}

export function useStation(id) {
  const [station, setStation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const activeIdRef = useRef(id)

  useEffect(() => {
    activeIdRef.current = id
  }, [id])

  const refresh = useCallback(async () => {
    if (!id) return
    const requestId = id
    try {
      const data = await fetchStation(id)
      if (activeIdRef.current !== requestId) return
      setStation(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      if (activeIdRef.current !== requestId) return
      setError(e)
    } finally {
      if (activeIdRef.current === requestId) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  return { station, loading, error, refresh, lastUpdated, setStation }
}
