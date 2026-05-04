import { Router } from 'express'
import { db } from '../config/database'

const router = Router()

router.get('/', (req, res) => {
  const filters: string[] = []
  const params: Array<string | number> = []

  if (typeof req.query.station_id === 'string' && req.query.station_id.trim()) {
    filters.push('station_id = ?')
    params.push(req.query.station_id)
  }

  if (typeof req.query.type === 'string' && req.query.type.trim()) {
    filters.push('type = ?')
    params.push(req.query.type)
  }

  if (typeof req.query.date === 'string' && req.query.date.trim()) {
    filters.push('date(timestamp) = date(?)')
    params.push(req.query.date)
  }

  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    filters.push('(station_id LIKE ? OR station_name LIKE ? OR type LIKE ? OR message LIKE ?)')
    const query = `%${req.query.q.trim()}%`
    params.push(query, query, query, query)
  }

  const limit = parseLimit(req.query.limit, 200, 500)
  params.push(limit)

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `SELECT id, station_id, station_name, type, actor, message, timestamp
       FROM activity
       ${where}
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all(...params) as Array<{
      id: string
      station_id: string | null
      station_name: string | null
      type: string
      actor: string
      message: string
      timestamp: string
    }>

  res.json(
    rows.map((row) => ({
      id: row.id,
      stationId: row.station_id,
      stationName: row.station_name,
      type: row.type,
      actor: row.actor,
      message: row.message,
      timestamp: row.timestamp,
    })),
  )
})

function parseLimit(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

export default router
