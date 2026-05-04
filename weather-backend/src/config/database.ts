import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { SEEDED_STATIONS } from '../models/Station'

const DEFAULT_DATABASE_DIR = path.resolve(__dirname, '../../database')
const DATABASE_DIR = path.resolve(
  process.env.DATABASE_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || DEFAULT_DATABASE_DIR,
)
const DATABASE_PATH = path.join(DATABASE_DIR, 'weather.db')

fs.mkdirSync(DATABASE_DIR, { recursive: true })

export const db = new Database(DATABASE_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initializeDatabase(): void {
  createTables()
  runMigrations()
  seedStationsIfEmpty()
}

function runMigrations(): void {
  const stationColumns = db
    .prepare("PRAGMA table_info(stations)")
    .all() as Array<{ name: string }>

  if (!stationColumns.some((column) => column.name === 'decommissioned_at')) {
    db.exec('ALTER TABLE stations ADD COLUMN decommissioned_at TEXT')
  }
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      region TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      elevation INTEGER DEFAULT 0,
      status TEXT DEFAULT 'RUNNING',
      battery REAL DEFAULT 100,
      signal REAL DEFAULT 90,
      installed_at TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      software_version TEXT DEFAULT '1.0.0',
      notes TEXT DEFAULT '',
      decommissioned_at TEXT
    );

    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id TEXT NOT NULL,
      air_temp REAL NOT NULL,
      ground_temp REAL NOT NULL,
      wind_speed REAL NOT NULL,
      wind_direction TEXT NOT NULL,
      pressure REAL NOT NULL,
      rainfall REAL NOT NULL,
      sunshine REAL NOT NULL,
      humidity REAL NOT NULL,
      battery REAL NOT NULL,
      signal REAL NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (station_id) REFERENCES stations(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL,
      station_name TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      value REAL NOT NULL,
      threshold REAL NOT NULL,
      acknowledged INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (station_id) REFERENCES stations(id)
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      station_id TEXT,
      station_name TEXT,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS software_updates (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL,
      version TEXT NOT NULL,
      file_name TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT NOT NULL,
      installed_at TEXT NOT NULL,
      FOREIGN KEY (station_id) REFERENCES stations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_stations_region ON stations(region);
    CREATE INDEX IF NOT EXISTS idx_stations_status ON stations(status);
    CREATE INDEX IF NOT EXISTS idx_readings_station_timestamp ON readings(station_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_station_ack ON alerts(station_id, acknowledged);
    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_updates_station ON software_updates(station_id, installed_at DESC);
  `)
}

function seedStationsIfEmpty(): void {
  const row = db.prepare('SELECT COUNT(*) AS count FROM stations').get() as { count: number }
  if (row.count > 0) return

  const insert = db.prepare(`
    INSERT INTO stations (
      id, name, name_ar, region, lat, lng, elevation, status, battery, signal, installed_at, active, software_version, notes
    ) VALUES (
      @id, @name, @name_ar, @region, @lat, @lng, @elevation, 'RUNNING', 100, @signal, @installed_at, 1, '1.0.0', @notes
    )
  `)

  const installedAt = new Date().toISOString()
  const transaction = db.transaction(() => {
    for (const station of SEEDED_STATIONS) {
      insert.run({
        ...station,
        signal: initialSignalForStation(station.id),
        installed_at: installedAt,
        notes: 'New Egyptian wilderness weather station deployed to improve remote climate coverage.',
      })
    }
  })

  transaction()
}

function initialSignalForStation(id: string): number {
  if (id === 'EG-003' || id === 'EG-014') return 62
  if (id === 'EG-007' || id === 'EG-008') return 68
  return 88
}

export function closeDatabase(): void {
  db.close()
}

initializeDatabase()
