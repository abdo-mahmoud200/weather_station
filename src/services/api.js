/**
 * Thin service layer over the mock data.
 *
 * Every function returns a Promise so that swapping the implementation
 * with a real HTTP client (fetch / axios) later is a drop-in change
 * in this single file. Consumers of the API do not need to know whether
 * data is coming from the mock layer or from a backend.
 *
 * To go live, set VITE_API_BASE and flip USE_MOCK to false.
 */

import {
  MOCK_ACTIVITY,
  MOCK_ALERTS,
  MOCK_STATIONS,
  generateRainfall7d,
  generateSeries,
  mockUpdateHistory,
} from './mockData'

const USE_MOCK = true
const API_BASE = import.meta.env.VITE_API_BASE || ''

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (value) => structuredClone(value)

const stationStore = clone(MOCK_STATIONS)
const alertStore = clone(MOCK_ALERTS)
const activityStore = clone(MOCK_ACTIVITY)
const updateHistoryStore = Object.fromEntries(
  stationStore.map((station) => [station.id, mockUpdateHistory(station.id)]),
)

let activitySeq = 2000 + activityStore.length

async function httpGet(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`)
  return response.json()
}

async function httpPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`POST ${path} failed: ${response.status}`)
  return response.json()
}

export async function fetchStations() {
  if (!USE_MOCK) return httpGet('/api/stations')
  await delay(120)
  return stationStore.filter((station) => !station.archivedAt).map((station) => clone(station))
}

export async function fetchStation(id) {
  if (!USE_MOCK) return httpGet(`/api/stations/${id}`)
  await delay(120)
  const station = getStation(id)
  if (!station || station.archivedAt) throw new Error(`Station not found: ${id}`)
  return clone(station)
}

export async function fetchStationRegistry() {
  if (!USE_MOCK) return httpGet('/api/stations/registry')
  await delay(140)
  return stationStore
    .slice()
    .sort((a, b) => {
      if (a.archivedAt && !b.archivedAt) return 1
      if (!a.archivedAt && b.archivedAt) return -1
      return a.id.localeCompare(b.id)
    })
    .map((station) => clone(station))
}

export async function fetchStationSeries(id, metric, hours = 24) {
  if (!USE_MOCK) return httpGet(`/api/stations/${id}/series?metric=${metric}&hours=${hours}`)
  await delay(80)

  const station = getStation(id)
  const series = generateSeries(id, metric, hours)
  const currentValue = station?.metrics?.[metric]?.current

  if (typeof currentValue !== 'number' || series.length === 0) return series

  const offset = currentValue - series[series.length - 1].value
  return series.map((point) => ({
    ...point,
    value: +(point.value + offset).toFixed(2),
  }))
}

export async function fetchRainfall7d(id) {
  if (!USE_MOCK) return httpGet(`/api/stations/${id}/rainfall`)
  await delay(80)

  const station = getStation(id)
  const rainfall = generateRainfall7d(id)
  const targetTotal = station?.metrics?.rainfall?.total7d

  if (typeof targetTotal !== 'number' || rainfall.length === 0) return rainfall

  const rawTotal = rainfall.reduce((sum, point) => sum + point.value, 0)
  if (rawTotal === 0) return rainfall

  const scaled = rainfall.map((point) => ({
    ...point,
    value: +((point.value / rawTotal) * targetTotal).toFixed(2),
  }))

  const scaledTotal = scaled.reduce((sum, point) => sum + point.value, 0)
  scaled[scaled.length - 1].value = +(scaled[scaled.length - 1].value + targetTotal - scaledTotal).toFixed(2)

  return scaled
}

export async function fetchUpdateHistory(id) {
  if (!USE_MOCK) return httpGet(`/api/stations/${id}/updates`)
  await delay(80)
  return clone(updateHistoryStore[id] || [])
}

export async function createStation(payload) {
  if (!USE_MOCK) return httpPost('/api/stations', payload)
  await delay(260)

  const stationId = String(payload.id || '').trim().toUpperCase()
  if (!stationId) throw new Error('Station ID is required.')
  if (getStation(stationId, { includeArchived: true })) {
    throw new Error(`Station ${stationId} already exists.`)
  }

  const station = buildStationRecord({
    ...payload,
    id: stationId,
  })

  stationStore.unshift(station)
  updateHistoryStore[station.id] = []

  prependActivity({
    station,
    type: 'system.station.registered',
    actor: 'operator@wws',
    message: `${station.id} registered for remote monitoring.`,
    timestamp: station.lastSync,
  })

  return clone(station)
}

export async function decommissionStation(id) {
  if (!USE_MOCK) return httpPost(`/api/stations/${id}/decommission`, {})
  await delay(240)

  const station = getStation(id, { includeArchived: true })
  if (!station) throw new Error(`Station not found: ${id}`)
  if (station.archivedAt) throw new Error(`Station ${id} is already archived.`)

  const timestamp = new Date().toISOString()
  station.archivedAt = timestamp
  station.state = 'Shutdown'
  station.online = false
  station.lastSync = timestamp
  hydrateStation(station)

  prependActivity({
    station,
    type: 'system.station.decommissioned',
    actor: 'operator@wws',
    message: `${station.id} removed from active monitoring and archived in the registry.`,
    timestamp,
  })

  return clone(station)
}

export async function sendStationCommand(id, command, payload = {}) {
  if (!USE_MOCK) return httpPost(`/api/stations/${id}/commands`, { command, ...payload })
  await delay(420)

  const station = getStation(id)
  if (!station) throw new Error(`Station not found: ${id}`)

  const timestamp = new Date().toISOString()

  if (command === 'restart') {
    station.state = 'Running'
    station.battery = Math.max(12, station.battery - 1)
    station.lastSync = timestamp
    hydrateStation(station)
    prependActivity({
      station,
      type: 'command.restart',
      actor: 'operator@wws',
      message: `Restart command issued to ${station.id}. Telemetry should resume within 30 seconds.`,
      timestamp,
    })
  }

  if (command === 'shutdown') {
    station.state = 'Shutdown'
    station.lastSync = timestamp
    hydrateStation(station)
    prependActivity({
      station,
      type: 'command.shutdown',
      actor: 'operator@wws',
      message: `Shutdown command issued to ${station.id}. Station moved to safe standby.`,
      timestamp,
    })
  }

  if (command === 'powersave') {
    station.state = station.state === 'Powersave' ? 'Running' : 'Powersave'
    station.battery = Math.min(100, Math.max(10, station.battery + (station.state === 'Powersave' ? 2 : -1)))
    station.lastSync = timestamp
    hydrateStation(station)
    prependActivity({
      station,
      type: 'command.powersave',
      actor: 'operator@wws',
      message:
        station.state === 'Powersave'
          ? `Power-save mode enabled on ${station.id}. Non-essential sensors are throttled.`
          : `Power-save mode disabled on ${station.id}. Full telemetry cadence restored.`,
      timestamp,
    })
  }

  if (command === 'remote') {
    station.state = 'Controlled'
    station.lastSync = timestamp
    hydrateStation(station)
    prependActivity({
      station,
      type: 'command.remote',
      actor: 'operator@wws',
      message: buildRemoteActivityMessage(station, payload),
      timestamp,
    })

    return {
      ok: true,
      command,
      stationId: id,
      response: buildRemoteResponse(station, payload, timestamp),
      station: clone(station),
      timestamp,
    }
  }

  return {
    ok: true,
    command,
    stationId: id,
    message: `${command} acknowledged.`,
    station: clone(station),
    timestamp,
  }
}

export async function uploadSoftware(id, file, onProgress) {
  if (!USE_MOCK) {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${API_BASE}/api/stations/${id}/software`, {
      method: 'POST',
      body: form,
    })
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
    return response.json()
  }

  return new Promise((resolve, reject) => {
    const station = getStation(id)
    if (!station) {
      reject(new Error(`Station not found: ${id}`))
      return
    }

    station.state = 'Configuring'
    hydrateStation(station)

    let progress = 0
    const intervalId = setInterval(() => {
      progress = Math.min(100, progress + 8 + Math.random() * 14)
      onProgress?.(Math.floor(progress))

      if (progress >= 100) {
        clearInterval(intervalId)

        const installedAt = new Date().toISOString()
        const version = bumpVersion(station.softwareVersion)

        station.state = 'Running'
        station.softwareVersion = version
        station.lastSync = installedAt
        hydrateStation(station)

        updateHistoryStore[id] = [
          {
            version,
            installedAt,
            status: 'success',
            notes: `Uploaded ${file?.name || 'update.bin'}.`,
          },
          ...(updateHistoryStore[id] || []),
        ]

        prependActivity({
          station,
          type: 'system.firmware.update',
          actor: 'operator@wws',
          message: `Firmware updated on ${station.id} to ${version}.`,
          timestamp: installedAt,
        })

        resolve({
          ok: true,
          stationId: id,
          fileName: file?.name || 'update.bin',
          installedAt,
          version,
          station: clone(station),
        })
      }
    }, 220)
  })
}

export async function fetchAlerts() {
  if (!USE_MOCK) return httpGet('/api/alerts')
  await delay(100)
  return clone(alertStore)
}

export async function updateAlertStatus(alertId, status) {
  if (!USE_MOCK) return httpPost(`/api/alerts/${alertId}/status`, { status })
  await delay(140)
  const alert = alertStore.find((item) => item.id === alertId)
  if (alert) alert.status = status
  return { ok: true, alertId, status }
}

export async function fetchActivity() {
  if (!USE_MOCK) return httpGet('/api/activity')
  await delay(100)
  return clone(activityStore)
}

export async function fetchReportData({ stationIds, types, from, to }) {
  if (!USE_MOCK) {
    return httpPost('/api/reports/preview', { stationIds, types, from, to })
  }

  await delay(200)

  const rows = []

  for (const id of stationIds) {
    const station = getStation(id)
    if (!station) continue

    const start = new Date(from).getTime()
    const end = new Date(to).getTime()

    for (let timestamp = start; timestamp <= end; timestamp += 3600 * 1000) {
      const row = {
        timestamp: new Date(timestamp).toISOString(),
        stationId: station.id,
        stationName: station.name,
      }

      if (types.includes('temperature')) {
        row.airTemperature = +(station.metrics.airTemperature.current + valueNoise(id, timestamp, 'air', 3)).toFixed(1)
      }

      if (types.includes('pressure')) {
        row.pressure = +(station.metrics.pressure.current + valueNoise(id, timestamp, 'pressure', 2)).toFixed(1)
      }

      if (types.includes('wind')) {
        row.windSpeed = Math.max(
          0,
          +(station.metrics.windSpeed.current + valueNoise(id, timestamp, 'wind', 3)).toFixed(1),
        )
        row.windDirection = normalizeBearing(
          station.metrics.windDirection.current + Math.round(valueNoise(id, timestamp, 'bearing', 80)),
        )
      }

      if (types.includes('rainfall')) {
        row.rainfall = Math.max(0, +(Math.abs(valueNoise(id, timestamp, 'rain', 1.1))).toFixed(2))
      }

      rows.push(row)
    }
  }

  return rows
}

function getStation(id, { includeArchived = false } = {}) {
  return stationStore.find(
    (station) => station.id === id && (includeArchived || !station.archivedAt),
  )
}

function hydrateStation(station) {
  station.online = station.state !== 'Shutdown'
  station.hasWarning =
    station.battery < 25 ||
    station.state === 'Testing' ||
    station.state === 'Configuring' ||
    Object.values(station.instruments || {}).some((instrument) => instrument.status !== 'OK')
}

function prependActivity({ station, type, actor, message, timestamp }) {
  activityStore.unshift({
    id: `EV-${activitySeq++}`,
    stationId: station.id,
    stationName: station.name,
    type,
    actor,
    message,
    timestamp,
  })
}

function buildRemoteActivityMessage(station, payload) {
  const instrumentLabels = {
    anemometer: 'anemometer',
    barometer: 'barometer',
    groundThermometer: 'ground thermometer',
  }
  const instrument = instrumentLabels[payload.instrument] || 'instrument'
  return `Remote command "${payload.command}" sent to ${instrument} on ${station.id}.`
}

function buildRemoteResponse(station, payload, timestamp) {
  if (!payload.instrument || !payload.command) return '> ERR missing parameters'

  const body = {
    anemometer: `OK: wind=${station.metrics.windSpeed.current.toFixed(1)} m/s bearing=${station.metrics.windDirection.current.toFixed(0)} deg`,
    barometer: `OK: p=${station.metrics.pressure.current.toFixed(1)} hPa`,
    groundThermometer: `OK: t=${station.metrics.groundTemperature.current.toFixed(1)} C`,
  }[payload.instrument] || 'OK'

  return `[${timestamp}] -> ${payload.instrument}.${payload.command}\n[${timestamp}] <- ${body}`
}

function bumpVersion(version) {
  const parts = String(version || '4.5.1')
    .split('.')
    .map((part) => Number.parseInt(part, 10))

  while (parts.length < 3) parts.push(0)
  parts[2] += 1

  return parts.join('.')
}

function valueNoise(id, timestamp, channel, amplitude) {
  const seed = `${id}:${timestamp}:${channel}`
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  const normalized = (Math.sin(hash) + Math.cos(hash / 2)) / 2
  return normalized * amplitude
}

function normalizeBearing(value) {
  return ((value % 360) + 360) % 360
}

function buildStationRecord(payload) {
  const timestamp = new Date().toISOString()
  const lat = Number(payload.lat)
  const lon = Number(payload.lon)
  const elevation = Number(payload.elevation) || 0
  const state = payload.initialState || 'Running'
  const thermalBias = Math.max(-8, Math.min(18, 18 - Math.abs(lat) / 4 - elevation / 800))
  const airTemperature = +thermalBias.toFixed(1)
  const groundTemperature = +(airTemperature - 1.2).toFixed(1)
  const pressure = +(1012 - elevation / 120 + Math.abs(lon % 7)).toFixed(1)
  const windSpeed = +(3 + Math.abs(lat % 6)).toFixed(1)
  const windDirection = normalizeBearing((Math.abs(lat) + Math.abs(lon)) * 3)
  const rainfall = +(Math.abs(lat % 4) * 0.6).toFixed(2)

  const station = {
    id: payload.id,
    name: payload.name,
    region: payload.region,
    coordinates: { lat, lon },
    elevation,
    state,
    online: state !== 'Shutdown',
    hasWarning: false,
    battery: 100,
    softwareVersion: '5.0.0',
    lastSync: timestamp,
    notes: payload.notes || '',
    metrics: {
      airTemperature: {
        current: airTemperature,
        min: +(airTemperature - 3.1).toFixed(1),
        max: +(airTemperature + 4.4).toFixed(1),
        avg: +(airTemperature - 0.3).toFixed(1),
        unit: 'deg C',
        trend: 'up',
      },
      groundTemperature: {
        current: groundTemperature,
        min: +(groundTemperature - 2.2).toFixed(1),
        max: +(groundTemperature + 2.8).toFixed(1),
        avg: +(groundTemperature - 0.1).toFixed(1),
        unit: 'deg C',
        trend: 'down',
      },
      pressure: {
        current: pressure,
        min: +(pressure - 5.4).toFixed(1),
        max: +(pressure + 4.8).toFixed(1),
        avg: +(pressure - 0.3).toFixed(1),
        unit: 'hPa',
        trend: 'up',
      },
      windSpeed: {
        current: windSpeed,
        min: +(Math.max(0, windSpeed - 1.8)).toFixed(1),
        max: +(windSpeed + 5.1).toFixed(1),
        avg: +(windSpeed + 0.7).toFixed(1),
        unit: 'm/s',
        trend: 'up',
      },
      windDirection: {
        current: windDirection,
        unit: 'deg',
      },
      rainfall: {
        total24h: rainfall,
        total7d: +(rainfall * 3.6).toFixed(2),
        unit: 'mm',
      },
    },
    instruments: {
      groundThermometer: {
        name: 'Ground Thermometer',
        status: 'OK',
        lastReading: groundTemperature,
        unit: 'deg C',
      },
      anemometer: {
        name: 'Anemometer',
        status: 'OK',
        lastReading: windSpeed,
        unit: 'm/s',
      },
      barometer: {
        name: 'Barometer',
        status: 'OK',
        lastReading: pressure,
        unit: 'hPa',
      },
    },
  }

  hydrateStation(station)
  return station
}
