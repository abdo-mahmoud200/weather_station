import { Router } from 'express'
import { db } from '../config/database'
import type { ReadingRow } from '../models/Reading'
import type { StationRow } from '../models/Station'
import { getActiveKhamaseenCount, getActiveKhamaseenEvents } from '../services/khamaseenEvents'
import { getLatestReading } from '../services/stationView'

const router = Router()

router.get('/summary', (_req, res) => {
  const stations = db.prepare('SELECT * FROM stations WHERE active = 1 ORDER BY id ASC').all() as StationRow[]
  const latestReadings = stations
    .map((station) => ({ station, reading: getLatestReading(station.id) }))
    .filter((item): item is { station: StationRow; reading: ReadingRow } => item.reading !== null)

  const online = stations.filter((station) => station.status !== 'SHUTDOWN').length
  const shutdown = stations.filter((station) => station.status === 'SHUTDOWN').length
  const collecting = stations.filter((station) => station.status === 'COLLECTING').length
  const transmitting = stations.filter((station) => station.status === 'TRANSMITTING').length
  const powersave = stations.filter((station) => station.status === 'POWERSAVE').length
  const configuring = stations.filter((station) => station.status === 'CONFIGURING').length
  const controlled = stations.filter((station) => station.status === 'CONTROLLED').length

  const warningRow = db.prepare("SELECT COUNT(*) AS count FROM alerts WHERE severity = 'warning' AND acknowledged = 0").get() as { count: number }
  const totalAlerts = db.prepare('SELECT COUNT(*) AS count FROM alerts').get() as { count: number }
  const unacknowledgedAlerts = db.prepare('SELECT COUNT(*) AS count FROM alerts WHERE acknowledged = 0').get() as { count: number }

  const avgTemp =
    latestReadings.length > 0
      ? round(latestReadings.reduce((sum, item) => sum + item.reading.air_temp, 0) / latestReadings.length, 1)
      : null

  const maxTemp = latestReadings.reduce<null | { value: number; stationName: string }>((current, item) => {
    if (!current || item.reading.air_temp > current.value) return { value: item.reading.air_temp, stationName: item.station.name }
    return current
  }, null)

  const minTemp = latestReadings.reduce<null | { value: number; stationName: string }>((current, item) => {
    if (!current || item.reading.air_temp < current.value) return { value: item.reading.air_temp, stationName: item.station.name }
    return current
  }, null)

  const regionSummary = Array.from(new Set(stations.map((station) => station.region))).map((region) => {
    const regionStations = stations.filter((station) => station.region === region)
    const regionReadings = latestReadings.filter((item) => item.station.region === region)
    const avgBattery =
      regionStations.length > 0
        ? round(regionStations.reduce((sum, station) => sum + station.battery, 0) / regionStations.length, 1)
        : null
    const avgRegionTemp =
      regionReadings.length > 0
        ? round(regionReadings.reduce((sum, item) => sum + item.reading.air_temp, 0) / regionReadings.length, 1)
        : null

    return {
      region,
      stationCount: regionStations.length,
      avgTemp: avgRegionTemp,
      avgBattery,
    }
  })

  res.json({
    online,
    offline: shutdown,
    warnings: warningRow.count,
    shutdown,
    collecting,
    transmitting,
    powersave,
    configuring,
    controlled,
    avgTemp,
    maxTemp,
    minTemp,
    totalAlerts: totalAlerts.count,
    unacknowledgedAlerts: unacknowledgedAlerts.count,
    khamaseenActive: getActiveKhamaseenCount(),
    khamaseenStations: getActiveKhamaseenEvents(),
    regionSummary,
  })
})

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits))
}

export default router
