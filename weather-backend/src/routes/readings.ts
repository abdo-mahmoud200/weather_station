import { Router } from 'express'
import { db } from '../config/database'
import { compassToDegrees, type ReadingRow } from '../models/Reading'

const router = Router()

const METRIC_COLUMNS: Record<string, keyof ReadingRow> = {
  airTemperature: 'air_temp',
  groundTemperature: 'ground_temp',
  pressure: 'pressure',
  windSpeed: 'wind_speed',
  rainfall: 'rainfall',
  sunshine: 'sunshine',
  humidity: 'humidity',
  battery: 'battery',
  signal: 'signal',
}

router.get('/:id/readings', (req, res) => {
  const stationId = req.params.id
  const limit = parseLimit(req.query.limit, 50, 1000)
  const filters: string[] = ['station_id = ?']
  const params: Array<string | number> = [stationId]

  if (typeof req.query.from === 'string') {
    filters.push('timestamp >= ?')
    params.push(req.query.from)
  }

  if (typeof req.query.to === 'string') {
    filters.push('timestamp <= ?')
    params.push(req.query.to)
  }

  params.push(limit)

  const rows = db
    .prepare(
      `SELECT * FROM readings
       WHERE ${filters.join(' AND ')}
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all(...params) as ReadingRow[]

  res.json(rows)
})

router.get('/:id/series', (req, res) => {
  const stationId = req.params.id
  const metric = typeof req.query.metric === 'string' ? req.query.metric : 'airTemperature'
  const hours = parseLimit(req.query.hours, 24, 720)
  const column = METRIC_COLUMNS[metric]

  if (!column) {
    res.status(400).json({
      error: 'Invalid metric',
      validMetrics: Object.keys(METRIC_COLUMNS),
    })
    return
  }

  const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const rows = db
    .prepare(
      `SELECT id, timestamp, ${String(column)} AS value
       FROM readings
       WHERE station_id = ? AND timestamp >= ?
       ORDER BY timestamp ASC`,
    )
    .all(stationId, from) as Array<{ id: number; timestamp: string; value: number }>

  res.json(
    rows.map((row) => ({
      t: new Date(row.timestamp).getTime(),
      time: row.timestamp,
      value: row.value,
    })),
  )
})

router.get('/:id/rainfall', (req, res) => {
  const stationId = req.params.id
  const days = 7
  const rows = db
    .prepare(
      `SELECT date(timestamp) AS day, SUM(rainfall) AS total
       FROM readings
       WHERE station_id = ? AND timestamp >= datetime('now', '-7 days')
       GROUP BY date(timestamp)
       ORDER BY day ASC`,
    )
    .all(stationId) as Array<{ day: string; total: number | null }>

  const totals = new Map(rows.map((row) => [row.day, Number(row.total ?? 0)]))
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const response = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * 86_400_000)
    const key = date.toISOString().slice(0, 10)
    response.push({
      t: date.getTime(),
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: Number((totals.get(key) ?? 0).toFixed(2)),
    })
  }

  res.json(response)
})

router.get('/:id/updates', (req, res) => {
  const rows = db
    .prepare(
      `SELECT version, installed_at AS installedAt, status, notes, file_name AS fileName
       FROM software_updates
       WHERE station_id = ?
       ORDER BY installed_at DESC`,
    )
    .all(req.params.id)

  res.json(rows)
})

router.get('/:id/wind-directions', (req, res) => {
  const limit = parseLimit(req.query.limit, 50, 500)
  const rows = db
    .prepare(
      `SELECT timestamp, wind_direction
       FROM readings
       WHERE station_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all(req.params.id, limit) as Array<{ timestamp: string; wind_direction: string }>

  res.json(
    rows.map((row) => ({
      timestamp: row.timestamp,
      direction: row.wind_direction,
      degrees: compassToDegrees(row.wind_direction),
    })),
  )
})

function parseLimit(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

export default router
