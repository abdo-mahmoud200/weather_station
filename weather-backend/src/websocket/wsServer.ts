import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { isOriginAllowed } from '../config/cors'

let io: Server | null = null

const AUTH_TOKEN = process.env.AUTH_TOKEN || 'wws-demo-token'
const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true'

export function initWebSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (isOriginAllowed(origin)) return cb(null, true)
        return cb(new Error(`Origin ${origin} not allowed by CORS`))
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
  })

  io.use((socket, next) => {
    if (AUTH_DISABLED) {
      next()
      return
    }
    const token = socket.handshake.auth?.token || socket.handshake.headers['x-auth-token']
    if (token !== AUTH_TOKEN) {
      next(new Error('unauthorized'))
      return
    }
    next()
  })

  io.on('connection', (socket) => {
    socket.on('subscribe:station', (stationId: string) => {
      if (stationId) socket.join(stationRoom(stationId))
    })

    socket.on('unsubscribe:station', (stationId: string) => {
      if (stationId) socket.leave(stationRoom(stationId))
    })
  })

  return io
}

export function emitToAll(event: string, payload: unknown): void {
  io?.emit(event, payload)
}

export function emitToStation(stationId: string, event: string, payload: unknown): void {
  io?.to(stationRoom(stationId)).emit(event, payload)
}

export function getWebSocketServer(): Server | null {
  return io
}

function stationRoom(stationId: string): string {
  return `station:${stationId}`
}
