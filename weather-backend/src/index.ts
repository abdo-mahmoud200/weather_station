import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import http from 'http'
import { closeDatabase } from './config/database'
import stationsRouter from './routes/stations'
import readingsRouter from './routes/readings'
import alertsRouter from './routes/alerts'
import statsRouter from './routes/stats'
import regionsRouter from './routes/regions'
import activityRouter from './routes/activity'
import authRouter, { requireAuth } from './routes/auth'
import { initWebSocket } from './websocket/wsServer'
import { startSimulator, stopSimulator } from './services/simulator'

const PORT = Number(process.env.PORT || 3001)
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

const app = express()
const server = http.createServer(app)

initWebSocket(server)

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'wilderness-weather-backend',
    country: 'Egypt',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRouter)

app.use('/api/stations', requireAuth, readingsRouter)
app.use('/api/stations', requireAuth, stationsRouter)
app.use('/api/alerts', requireAuth, alertsRouter)
app.use('/api/stats', requireAuth, statsRouter)
app.use('/api/regions', requireAuth, regionsRouter)
app.use('/api/activity', requireAuth, activityRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({ error: error.message || 'Internal server error.' })
})

server.listen(PORT, () => {
  console.log(`Wilderness Weather backend running on http://localhost:${PORT}`)
  startSimulator()
})

function shutdown(): void {
  console.log('Stopping Wilderness Weather backend...')
  stopSimulator()
  server.close(() => {
    closeDatabase()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
