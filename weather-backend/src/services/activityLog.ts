import { v4 as uuidv4 } from 'uuid'
import { db } from '../config/database'

export interface ActivityEntry {
  id: string
  station_id: string | null
  station_name: string | null
  stationId: string | null
  stationName: string | null
  type: string
  actor: string
  message: string
  timestamp: string
}

export interface LogActivityInput {
  stationId?: string | null
  stationName?: string | null
  type: string
  actor?: string
  message: string
}

const insertActivity = db.prepare(`
  INSERT INTO activity (id, station_id, station_name, type, actor, message, timestamp)
  VALUES (@id, @station_id, @station_name, @type, @actor, @message, @timestamp)
`)

export function logActivity(input: LogActivityInput): ActivityEntry {
  const entry = {
    id: uuidv4(),
    station_id: input.stationId ?? null,
    station_name: input.stationName ?? null,
    type: input.type,
    actor: input.actor ?? 'system',
    message: input.message,
    timestamp: new Date().toISOString(),
  }

  insertActivity.run(entry)

  return {
    ...entry,
    stationId: entry.station_id,
    stationName: entry.station_name,
  }
}

export function listActivity(limit = 200): ActivityEntry[] {
  const rows = db
    .prepare(
      `SELECT id, station_id, station_name, type, actor, message, timestamp
       FROM activity
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all(Math.max(1, Math.min(limit, 500))) as Array<Omit<ActivityEntry, 'stationId' | 'stationName'>>

  return rows.map((row) => ({
    ...row,
    stationId: row.station_id,
    stationName: row.station_name,
  }))
}
