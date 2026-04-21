import { useEffect, useState } from 'react'
import { fetchStationSeries, fetchRainfall7d } from '../services/api'

/**
 * Fetches a single metric time-series for a station.
 */
export function useStationSeries(stationId, metric, hours = 24, refreshKey = 0) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchStationSeries(stationId, metric, hours)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [stationId, metric, hours, refreshKey])

  return { data, loading }
}

/**
 * Fetches the 7-day rainfall aggregate for a station.
 */
export function useRainfall7d(stationId, refreshKey = 0) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchRainfall7d(stationId)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [stationId, refreshKey])

  return { data, loading }
}
