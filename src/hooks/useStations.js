import { useCallback, useEffect, useState } from 'react'
import { fetchStations, fetchStation } from '../services/api'

export function useStations() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchStations()
      setStations(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
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

  const refresh = useCallback(async () => {
    if (!id) return
    try {
      const data = await fetchStation(id)
      setStation(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  return { station, loading, error, refresh, lastUpdated, setStation }
}
