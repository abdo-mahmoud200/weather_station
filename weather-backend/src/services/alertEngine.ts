import { v4 as uuidv4 } from 'uuid'
import { db } from '../config/database'
import type { AlertRow, AlertSeverity } from '../models/Alert'
import { toAlertResponse } from '../models/Alert'
import type { ReadingRow } from '../models/Reading'
import type { StationRow } from '../models/Station'
import { emitToAll } from '../websocket/wsServer'

const findActiveDuplicate = db.prepare(`
  SELECT id FROM alerts
  WHERE station_id = ? AND type = ? AND acknowledged = 0
  LIMIT 1
`)

const insertAlert = db.prepare(`
  INSERT INTO alerts (
    id, station_id, station_name, type, severity, message, value, threshold, acknowledged, timestamp
  ) VALUES (
    @id, @station_id, @station_name, @type, @severity, @message, @value, @threshold, 0, @timestamp
  )
`)

export function evaluateReadingAlerts(station: StationRow, reading: ReadingRow): AlertRow[] {
  const alerts: AlertRow[] = []

  if (reading.air_temp > 50) {
    alerts.push(createAlertIfNeeded(station, 'temperature_critical', 'critical', 'حرارة حرجة - خطر', reading.air_temp, 50))
  } else if (reading.air_temp > 45) {
    alerts.push(createAlertIfNeeded(station, 'temperature_high', 'warning', 'حرارة مرتفعة جداً', reading.air_temp, 45))
  } else if (reading.air_temp < -5) {
    alerts.push(createAlertIfNeeded(station, 'temperature_freezing', 'warning', 'درجات تجمد - سيناء', reading.air_temp, -5))
  }

  if (reading.battery < 15) {
    alerts.push(createAlertIfNeeded(station, 'battery_critical', 'critical', 'بطارية حرجة - توقف وشيك', reading.battery, 15))
  } else if (reading.battery < 30) {
    alerts.push(createAlertIfNeeded(station, 'battery_low', 'warning', 'بطارية منخفضة', reading.battery, 30))
  }

  if (reading.signal < 25) {
    alerts.push(createAlertIfNeeded(station, 'signal_lost', 'critical', 'فقدان الإشارة', reading.signal, 25))
  } else if (reading.signal < 40) {
    alerts.push(createAlertIfNeeded(station, 'signal_weak', 'warning', 'ضعف الإشارة', reading.signal, 40))
  }

  if (reading.wind_speed > 25) {
    alerts.push(createAlertIfNeeded(station, 'wind_storm', 'critical', 'عاصفة رياح - خماسين', reading.wind_speed, 25))
  } else if (reading.wind_speed > 18) {
    alerts.push(createAlertIfNeeded(station, 'wind_strong', 'warning', 'رياح قوية', reading.wind_speed, 18))
  }

  cleanupAlerts()
  return alerts.filter(Boolean)
}

export function evaluateStationAlerts(station: StationRow): AlertRow[] {
  const alerts: AlertRow[] = []

  if (station.status === 'SHUTDOWN') {
    alerts.push(createAlertIfNeeded(station, 'station_shutdown', 'critical', 'المحطة متوقفة', 1, 1))
  }

  const latest = db
    .prepare('SELECT timestamp FROM readings WHERE station_id = ? ORDER BY timestamp DESC LIMIT 1')
    .get(station.id) as { timestamp: string } | undefined

  if (station.status !== 'SHUTDOWN') {
    const lastReadingAt = latest ? new Date(latest.timestamp).getTime() : 0
    const threeIntervals = 15 * 60 * 1000
    const installedAt = station.installed_at ? new Date(station.installed_at).getTime() : 0
    const recentlyInstalled = installedAt > 0 && Date.now() - installedAt < threeIntervals
    if (!recentlyInstalled && (!lastReadingAt || Date.now() - lastReadingAt > threeIntervals)) {
      alerts.push(createAlertIfNeeded(station, 'station_connection_lost', 'critical', 'انقطع الاتصال بالمحطة', 1, 1))
    }
  }

  cleanupAlerts()
  return alerts.filter(Boolean)
}

export function acknowledgeAlert(alertId: string): AlertRow | null {
  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(alertId)
  const row = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId) as AlertRow | undefined
  return row ?? null
}

export function clearAcknowledgedAlerts(): number {
  const result = db.prepare('DELETE FROM alerts WHERE acknowledged = 1').run()
  return result.changes
}

function createAlertIfNeeded(
  station: StationRow,
  type: string,
  severity: AlertSeverity,
  message: string,
  value: number,
  threshold: number,
): AlertRow {
  const duplicate = findActiveDuplicate.get(station.id, type) as { id: string } | undefined
  if (duplicate) return nullAlert()

  const alert: AlertRow = {
    id: uuidv4(),
    station_id: station.id,
    station_name: station.name,
    type,
    severity,
    message,
    value: round(value, 1),
    threshold,
    acknowledged: 0,
    timestamp: new Date().toISOString(),
  }

  insertAlert.run(alert)
  emitToAll('alert:new', { alert: toAlertResponse(alert) })

  return alert
}

function cleanupAlerts(): void {
  const total = db.prepare('SELECT COUNT(*) AS count FROM alerts').get() as { count: number }
  if (total.count <= 200) return

  let overflow = total.count - 200
  const acknowledgedDeleted = db
    .prepare(
      `DELETE FROM alerts
       WHERE id IN (
         SELECT id FROM alerts
         WHERE acknowledged = 1
         ORDER BY timestamp ASC
         LIMIT ?
       )`,
    )
    .run(overflow)

  overflow -= acknowledgedDeleted.changes
  if (overflow <= 0) return

  db.prepare(
    `DELETE FROM alerts
     WHERE id IN (
       SELECT id FROM alerts
       ORDER BY timestamp ASC
       LIMIT ?
     )`,
  ).run(overflow)
}

function nullAlert(): AlertRow {
  return null as unknown as AlertRow
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits))
}
