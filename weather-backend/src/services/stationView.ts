import { db } from '../config/database'
import type { ReadingRow } from '../models/Reading'
import type { StationRow, StationWithLatest } from '../models/Station'

export function getLatestReading(stationId: string): ReadingRow | null {
  return (
    (db.prepare('SELECT * FROM readings WHERE station_id = ? ORDER BY timestamp DESC LIMIT 1').get(stationId) as
      | ReadingRow
      | undefined) ?? null
  )
}

export function getActiveAlertsCount(stationId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM alerts WHERE station_id = ? AND acknowledged = 0')
    .get(stationId) as { count: number }
  return row.count
}

export function toStationWithLatest(station: StationRow): StationWithLatest {
  return {
    ...station,
    latest_reading: getLatestReading(station.id),
    active_alerts_count: getActiveAlertsCount(station.id),
    online: station.active === 1 && station.status !== 'SHUTDOWN',
  }
}

export function getStationById(stationId: string, includeInactive = false): StationWithLatest | null {
  const query = includeInactive
    ? 'SELECT * FROM stations WHERE id = ?'
    : 'SELECT * FROM stations WHERE id = ? AND active = 1'

  const station = db.prepare(query).get(stationId) as StationRow | undefined
  return station ? toStationWithLatest(station) : null
}
