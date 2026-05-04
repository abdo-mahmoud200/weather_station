import { io } from 'socket.io-client'
import { getAuthToken } from './auth'

const SOCKET_BASE = import.meta.env.VITE_SOCKET_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001'

let socket = null
const listeners = new Set()
let state = {
  connected: false,
  status: 'disconnected',
}

export function getSocket() {
  if (socket) return socket

  socket = io(SOCKET_BASE, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 750,
    reconnectionDelayMax: 5000,
    auth: (cb) => cb({ token: getAuthToken() }),
  })

  setStatus('connecting')

  socket.on('connect', () => {
    setStatus('connected')
  })

  socket.on('disconnect', () => {
    setStatus('disconnected')
  })

  socket.io.on('reconnect_attempt', () => {
    setStatus('connecting')
  })

  socket.io.on('reconnect_error', () => {
    setStatus('disconnected')
  })

  return socket
}

export function subscribeSocketState(listener) {
  listeners.add(listener)
  listener(state)

  return () => {
    listeners.delete(listener)
  }
}

export function subscribeToSocketEvents(handlers) {
  const activeSocket = getSocket()
  const entries = Object.entries(handlers).filter(([, handler]) => typeof handler === 'function')

  for (const [eventName, handler] of entries) {
    activeSocket.on(eventName, handler)
  }

  return () => {
    for (const [eventName, handler] of entries) {
      activeSocket.off(eventName, handler)
    }
  }
}

export function subscribeToStation(stationId) {
  if (!stationId) return () => {}

  const activeSocket = getSocket()
  activeSocket.emit('subscribe:station', stationId)

  return () => {
    activeSocket.emit('unsubscribe:station', stationId)
  }
}

export function getSocketState() {
  return state
}

export function disconnectSocket() {
  if (!socket) return
  socket.disconnect()
  socket = null
  setStatus('disconnected')
}

function setStatus(status) {
  state = {
    connected: status === 'connected',
    status,
  }

  for (const listener of listeners) {
    listener(state)
  }
}
