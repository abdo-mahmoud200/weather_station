import { useEffect, useRef, useState } from 'react'
import {
  getSocket,
  getSocketState,
  subscribeSocketState,
  subscribeToSocketEvents,
  subscribeToStation,
} from '../services/socket'

export function useSocketConnection() {
  const [connection, setConnection] = useState(() => getSocketState())

  useEffect(() => {
    getSocket()
    return subscribeSocketState(setConnection)
  }, [])

  return connection
}

export function useSocketEvents(handlers, deps = []) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const wrappedHandlers = Object.fromEntries(
      Object.keys(handlersRef.current).map((eventName) => [
        eventName,
        (payload) => handlersRef.current[eventName]?.(payload),
      ]),
    )

    return subscribeToSocketEvents(wrappedHandlers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function useStationSocket(stationId) {
  useEffect(() => subscribeToStation(stationId), [stationId])
}

/**
 * Subscribes to socket events and triggers `refresh()` (debounced).
 *
 * `options.filter(eventName, payload)` — return false to skip an event.
 *   Useful for station-scoped views that should ignore unrelated events.
 */
export function useRealtimeRefresh(refresh, events, deps = [], options = {}) {
  const { delayMs = 350, filter } = typeof options === 'number' ? { delayMs: options } : options
  const refreshRef = useRef(refresh)
  const filterRef = useRef(filter)
  const timeoutRef = useRef(null)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    filterRef.current = filter
  }, [filter])

  useSocketEvents(
    Object.fromEntries(
      events.map((eventName) => [
        eventName,
        (payload) => {
          if (filterRef.current && filterRef.current(eventName, payload) === false) return
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null
            refreshRef.current?.()
          }, delayMs)
        },
      ]),
    ),
    deps,
  )

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    [],
  )
}
