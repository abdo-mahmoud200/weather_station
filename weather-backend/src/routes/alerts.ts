import { Router } from 'express'
import { db } from '../config/database'
import type { AlertRow } from '../models/Alert'
import { toAlertResponse } from '../models/Alert'
import { acknowledgeAlert, clearAcknowledgedAlerts } from '../services/alertEngine'
import { logActivity } from '../services/activityLog'

const router = Router()

router.get('/', (req, res) => {
  const filters: string[] = []
  const params: Array<string | number> = []

  if (req.query.unacknowledged === 'true') {
    filters.push('acknowledged = 0')
  }

  if (typeof req.query.station_id === 'string') {
    filters.push('station_id = ?')
    params.push(req.query.station_id)
  }

  if (typeof req.query.severity === 'string') {
    filters.push('severity = ?')
    params.push(req.query.severity)
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT * FROM alerts ${where} ORDER BY timestamp DESC`)
    .all(...params) as AlertRow[]

  res.json(rows.map(toAlertResponse))
})

router.patch('/:id/acknowledge', (req, res) => {
  const alert = acknowledgeAlert(req.params.id)
  if (!alert) {
    res.status(404).json({ error: `Alert not found: ${req.params.id}` })
    return
  }

  logActivity({
    stationId: alert.station_id,
    stationName: alert.station_name,
    type: 'alert.acknowledged',
    actor: 'operator',
    message: `${alert.id} acknowledged.`,
  })

  res.json(toAlertResponse(alert))
})

router.delete('/acknowledged', (_req, res) => {
  const deleted = clearAcknowledgedAlerts()
  logActivity({
    type: 'alert.acknowledged.clear',
    actor: 'operator',
    message: `${deleted} acknowledged alerts cleared.`,
  })
  res.json({ ok: true, deleted })
})

export default router
