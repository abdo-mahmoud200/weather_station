/**
 * Backend API adapter.
 *
 * The React UI was originally built around a richer frontend station shape.
 * The Node backend returns normalized database rows, so this file translates
 * backend responses into the shape the existing components already render.
 */

import { clearStoredSession, getAuthToken } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

const STATUS_LABELS = {
  RUNNING: 'Running',
  COLLECTING: 'Collecting',
  TRANSMITTING: 'Transmitting',
  POWERSAVE: 'Powersave',
  CONFIGURING: 'Configuring',
  CONTROLLED: 'Controlled',
  SHUTDOWN: 'Shutdown',
}

const COMPASS_TO_DEGREES = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
}

async function request(path, options = {}) {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    clearStoredSession()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    throw new Error('Session expired. Please sign in again.')
  }

  if (!response.ok) {
    let message = `${options.method || 'GET'} ${path} failed: ${response.status}`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // Keep the status-based message when the response body is not JSON.
    }
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}

const httpGet = (path) => request(path)
const httpPost = (path, body) =>
  request(path, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
const httpPut = (path, body) =>
  request(path, {
    method: 'PUT',
    body: JSON.stringify(body ?? {}),
  })
const httpPatch = (path, body) =>
  request(path, {
    method: 'PATCH',
    body: JSON.stringify(body ?? {}),
  })
const httpDelete = (path) =>
  request(path, {
    method: 'DELETE',
  })

export async function fetchStations() {
  const stations = await httpGet('/api/stations')
  return stations.map(mapStation)
}

export async function fetchStation(id) {
  const station = await httpGet(`/api/stations/${encodeURIComponent(id)}`)
  return mapStation(station)
}

export async function fetchStationRegistry() {
  const stations = await httpGet('/api/stations/registry')
  return stations.map(mapStation)
}

export async function fetchStationSeries(id, metric, hours = 24) {
  const params = new URLSearchParams({ metric, hours: String(hours) })
  return httpGet(`/api/stations/${encodeURIComponent(id)}/series?${params.toString()}`)
}

export async function fetchRainfall7d(id) {
  return httpGet(`/api/stations/${encodeURIComponent(id)}/rainfall`)
}

export async function fetchUpdateHistory(id) {
  return httpGet(`/api/stations/${encodeURIComponent(id)}/updates`)
}

export async function createStation(payload) {
  const station = await httpPost('/api/stations', {
    name: payload.name,
    name_ar: payload.name_ar || payload.nameAr || payload.name,
    region: payload.region,
    lat: Number(payload.lat),
    lng: Number(payload.lng ?? payload.lon),
    elevation: Number(payload.elevation) || 0,
    notes: payload.notes || '',
    initialState: payload.initialState || 'Running',
  })
  return mapStation(station)
}

export async function updateStation(id, payload) {
  const station = await httpPut(`/api/stations/${encodeURIComponent(id)}`, {
    name: payload.name,
    name_ar: payload.name_ar || payload.nameAr || payload.name,
    region: payload.region,
    lat: Number(payload.lat),
    lng: Number(payload.lng ?? payload.lon),
    elevation: Number(payload.elevation) || 0,
    notes: payload.notes || '',
  })
  return mapStation(station)
}

export async function decommissionStation(id) {
  return httpDelete(`/api/stations/${encodeURIComponent(id)}`)
}

export async function sendStationCommand(id, command, payload = {}) {
  const body = {
    ...payload,
    command,
  }

  if (command === 'remote' && payload.command && !payload.action) {
    body.action = payload.command
  }

  const response = await httpPost(`/api/stations/${encodeURIComponent(id)}/command`, body)
  return {
    ...response,
    station: response.station ? mapStation(response.station) : undefined,
  }
}

export async function uploadSoftware(id, file, onProgress) {
  const fileName = file?.name || 'firmware.bin'
  const token = getAuthToken()

  const response = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/stations/${encodeURIComponent(id)}/software`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Accept', 'application/json')

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      try {
        const body = xhr.responseText ? JSON.parse(xhr.responseText) : {}
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100)
          resolve(body)
          return
        }
        reject(new Error(body?.error || `Upload failed: ${xhr.status}`))
      } catch (error) {
        reject(error)
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.onabort = () => reject(new Error('Upload aborted.'))

    const formData = new FormData()
    if (file) formData.append('file', file, fileName)
    formData.append('fileName', fileName)
    xhr.send(formData)
  })

  const station = response.station ? mapStation(response.station) : null
  return {
    ok: true,
    stationId: id,
    fileName,
    installedAt: response.timestamp || new Date().toISOString(),
    version: station?.softwareVersion || response.station?.software_version || '1.0.0',
    bytesUploaded: response.bytesUploaded ?? 0,
    station,
  }
}

export async function fetchAlerts() {
  const alerts = await httpGet('/api/alerts')
  return alerts.map(mapAlert)
}

export async function updateAlertStatus(alertId, status) {
  if (status === 'new') {
    return { ok: true, alertId, status }
  }

  const alert = await httpPatch(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`, {})
  return { ok: true, alertId, status, alert: mapAlert(alert) }
}

export async function fetchActivity() {
  return httpGet('/api/activity')
}

export async function fetchStatsSummary() {
  return httpGet('/api/stats/summary')
}

export async function fetchReportData({ stationIds, types, from, to }) {
  const rowsByStation = await Promise.all(
    stationIds.map(async (stationId) => {
      const [station, readings] = await Promise.all([
        fetchStation(stationId),
        httpGet(
          `/api/stations/${encodeURIComponent(stationId)}/readings?${new URLSearchParams({
            limit: '1000',
            from,
            to,
          }).toString()}`,
        ),
      ])

      return readings.map((reading) => mapReportRow(station, reading, types))
    }),
  )

  return rowsByStation
    .flat()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

function mapStation(raw) {
  const reading = raw.latest_reading || raw.latestReading || null
  const status = raw.status || 'RUNNING'
  const state = STATUS_LABELS[status] || toTitleCase(status)
  const windDegrees = compassToDegrees(reading?.wind_direction)
  const lastSync = reading?.timestamp || raw.installed_at || new Date().toISOString()
  const battery = Number(reading?.battery ?? raw.battery ?? 0)
  const signal = Number(reading?.signal ?? raw.signal ?? 0)
  const active = Number(raw.active ?? 1) === 1
  const online = active && state !== 'Shutdown'
  const activeAlerts = Number(raw.active_alerts_count ?? raw.activeAlertsCount ?? 0)

  const airTemp = numeric(reading?.air_temp, null)
  const groundTemp = numeric(reading?.ground_temp, airTemp === null ? null : airTemp + 2)
  const pressure = numeric(reading?.pressure, null)
  const windSpeed = numeric(reading?.wind_speed, null)
  const rainfall = numeric(reading?.rainfall, 0)
  const instruments = buildInstruments({ airTemp, groundTemp, pressure, windSpeed })
  const warningReasons = buildWarningReasons({
    activeAlerts,
    battery,
    signal,
    airTemp,
    groundTemp,
    pressure,
    windSpeed,
    instruments,
  })

  return {
    id: raw.id,
    name: raw.name,
    nameAr: raw.name_ar,
    region: raw.region,
    coordinates: {
      lat: Number(raw.lat),
      lon: Number(raw.lng),
    },
    elevation: Number(raw.elevation || 0),
    state,
    online,
    hasWarning: online && warningReasons.length > 0,
    warningReasons,
    activeAlerts,
    battery: Math.round(battery),
    signal: Math.round(signal),
    softwareVersion: raw.software_version || raw.softwareVersion || '1.0.0',
    lastSync,
    notes: raw.notes || '',
    archivedAt: active ? null : raw.decommissioned_at || raw.installed_at || lastSync,
    metrics: {
      airTemperature: metricSummary(airTemp, 'deg C', 3.5),
      groundTemperature: metricSummary(groundTemp, 'deg C', 3),
      pressure: metricSummary(pressure, 'hPa', 4),
      windSpeed: metricSummary(windSpeed, 'm/s', 4),
      windDirection: {
        current: windDegrees,
        unit: 'deg',
      },
      rainfall: {
        total24h: rainfall,
        total7d: null,
        unit: 'mm',
      },
    },
    instruments,
  }
}

function mapAlert(raw) {
  return {
    ...raw,
    stationId: raw.stationId || raw.station_id,
    stationName: raw.stationName || raw.station_name,
    status: raw.status || (raw.acknowledged ? 'acknowledged' : 'new'),
  }
}

function mapReportRow(station, reading, types) {
  const row = {
    timestamp: reading.timestamp,
    stationId: station.id,
    stationName: station.name,
  }

  if (types.includes('temperature')) {
    row.airTemperature = reading.air_temp
    row.groundTemperature = reading.ground_temp
    row.humidity = reading.humidity
  }

  if (types.includes('pressure')) {
    row.pressure = reading.pressure
  }

  if (types.includes('wind')) {
    row.windSpeed = reading.wind_speed
    row.windDirection = reading.wind_direction
  }

  if (types.includes('rainfall')) {
    row.rainfall = reading.rainfall
    row.sunshine = reading.sunshine
  }

  return row
}

function buildInstruments({ groundTemp, pressure, windSpeed }) {
  const hasGroundTemp = Number.isFinite(Number(groundTemp))
  const hasPressure = Number.isFinite(Number(pressure))
  const hasWindSpeed = Number.isFinite(Number(windSpeed))

  return {
    groundThermometer: {
      name: 'Ground Thermometer',
      status: hasGroundTemp && (groundTemp > 50 || groundTemp < -10) ? 'Warning' : 'OK',
      lastReading: groundTemp,
      unit: 'deg C',
    },
    anemometer: {
      name: 'Anemometer',
      status: hasWindSpeed && windSpeed > 25 ? 'Failed' : hasWindSpeed && windSpeed > 18 ? 'Warning' : 'OK',
      lastReading: windSpeed,
      unit: 'm/s',
    },
    barometer: {
      name: 'Barometer',
      status: hasPressure && (pressure < 980 || pressure > 1030) ? 'Warning' : 'OK',
      lastReading: pressure,
      unit: 'hPa',
    },
  }
}

function buildWarningReasons({
  activeAlerts,
  battery,
  signal,
  airTemp,
  groundTemp,
  pressure,
  windSpeed,
  instruments,
}) {
  const reasons = []

  if (activeAlerts > 0) {
    reasons.push({
      code: 'active_alerts',
      label: 'Active alerts',
      detail: `${activeAlerts} unacknowledged alert${activeAlerts === 1 ? '' : 's'}`,
      severity: activeAlerts > 2 ? 'critical' : 'warning',
      action: { type: 'route', label: 'Review alerts', to: '/alerts' },
    })
  }

  if (battery < 30) {
    reasons.push({
      code: 'battery_low',
      label: battery < 15 ? 'Battery critical' : 'Battery low',
      detail: `${Math.round(battery)}% battery`,
      severity: battery < 15 ? 'critical' : 'warning',
      action: {
        type: 'command',
        label: 'Enable powersave',
        command: 'powersave',
        payload: { enabled: true },
      },
    })
  }

  if (signal < 40) {
    reasons.push({
      code: 'signal_weak',
      label: signal < 25 ? 'Signal lost' : 'Signal weak',
      detail: `${Math.round(signal)}% signal`,
      severity: signal < 25 ? 'critical' : 'warning',
      action: {
        type: 'command',
        label: 'Stabilize link',
        command: 'reconfigure',
        payload: {
          settings: {
            readingIntervalSeconds: 60,
            alertProfile: 'maintenance',
            transmissionMode: 'low-power',
          },
        },
      },
    })
  }

  if (windSpeed > 18) {
    reasons.push({
      code: 'wind_strong',
      label: windSpeed > 25 ? 'Storm wind' : 'Strong wind',
      detail: `${windSpeed.toFixed(1)} m/s wind`,
      severity: windSpeed > 25 ? 'critical' : 'warning',
      action: {
        type: 'command',
        label: 'Apply storm watch',
        command: 'reconfigure',
        payload: {
          settings: {
            readingIntervalSeconds: 10,
            alertProfile: 'desert-extreme',
            transmissionMode: 'realtime',
          },
        },
      },
    })
  }

  if (airTemp > 45) {
    reasons.push({
      code: 'temperature_high',
      label: airTemp > 50 ? 'Critical heat' : 'High temperature',
      detail: `${airTemp.toFixed(1)} deg C air`,
      severity: airTemp > 50 ? 'critical' : 'warning',
      action: {
        type: 'command',
        label: 'Apply heat watch',
        command: 'reconfigure',
        payload: {
          settings: {
            readingIntervalSeconds: 10,
            alertProfile: 'desert-extreme',
            transmissionMode: 'realtime',
          },
        },
      },
    })
  }

  const groundOutOfRange = Number.isFinite(Number(groundTemp)) && (groundTemp > 50 || groundTemp < -10)
  const pressureOutOfRange = Number.isFinite(Number(pressure)) && (pressure < 980 || pressure > 1030)

  if (groundOutOfRange || pressureOutOfRange) {
    const failing = Object.values(instruments || {}).find((instrument) => instrument.status !== 'OK')
    if (failing) {
      reasons.push({
        code: 'instrument_check',
        label: 'Hardware check',
        detail: `${failing.name} reports ${failing.status}`,
        severity: failing.status === 'Failed' ? 'critical' : 'warning',
        hardware: true,
      })
    }
  }

  return reasons
}

function metricSummary(current, unit, spread) {
  const value = numeric(current, null)
  if (value === null) {
    return {
      current: null,
      min: null,
      max: null,
      avg: null,
      unit,
      trend: 'flat',
    }
  }

  return {
    current: value,
    min: Number((value - spread).toFixed(1)),
    max: Number((value + spread).toFixed(1)),
    avg: Number((value - spread / 5).toFixed(1)),
    unit,
    trend: Math.random() > 0.5 ? 'up' : 'down',
  }
}

function compassToDegrees(direction) {
  if (typeof direction === 'number') return direction
  return COMPASS_TO_DEGREES[String(direction || '').toUpperCase()] ?? 0
}

function numeric(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function toTitleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/(^|_)([a-z])/g, (_match, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`)
}

