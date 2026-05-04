/**
 * Mock data for the Wilderness Weather Station monitoring system.
 *
 * The shape and semantics match what a real backend is expected to
 * emit; swapping the implementations in `api.js` for real HTTP calls
 * should be the only change required in the services layer.
 */

const STATES = [
  'Running',
  'Collecting',
  'Summarizing',
  'Transmitting',
  'Powersave',
  'Testing',
  'Configuring',
  'Controlled',
  'Shutdown',
]

const REGIONS = [
  'Western Desert',
  'Eastern Desert',
  'South Sinai Mtn',
  'South Sinai',
  'Sinai Coast',
  'Red Sea Coast',
  'Upper Egypt',
]

const LOCATIONS = [
  { id: 'WS-001', name: 'Ravenscrag Peak', region: 'Alpine North', lat: 51.4817, lon: -116.1773, elevation: 2412 },
  { id: 'WS-002', name: 'Silverthorn Ridge', region: 'Alpine North', lat: 50.9812, lon: -115.3409, elevation: 2103 },
  { id: 'WS-003', name: 'Blackfoot Pass', region: 'Alpine South', lat: 49.3331, lon: -114.0092, elevation: 1987 },
  { id: 'WS-004', name: 'Tideview Point', region: 'Coastal West', lat: 49.3811, lon: -124.9172, elevation: 42 },
  { id: 'WS-005', name: 'Cape Harrow', region: 'Coastal West', lat: 50.1204, lon: -127.4567, elevation: 128 },
  { id: 'WS-006', name: 'Gannet Isle', region: 'Coastal East', lat: 47.5402, lon: -52.7141, elevation: 71 },
  { id: 'WS-007', name: 'Saltmarsh Flats', region: 'Coastal East', lat: 45.2103, lon: -61.1835, elevation: 18 },
  { id: 'WS-008', name: 'Burnt Mesa', region: 'Desert Basin', lat: 34.4012, lon: -109.3921, elevation: 1612 },
  { id: 'WS-009', name: 'Dry Gulch', region: 'Desert Basin', lat: 35.1121, lon: -111.8712, elevation: 1894 },
  { id: 'WS-010', name: 'Kestrel Hollow', region: 'Boreal Forest', lat: 54.7134, lon: -101.8723, elevation: 412 },
  { id: 'WS-011', name: 'Mossback Grove', region: 'Boreal Forest', lat: 55.9812, lon: -104.3312, elevation: 378 },
  { id: 'WS-012', name: 'Frost Hollow', region: 'Tundra', lat: 68.2451, lon: -133.4915, elevation: 312 },
  { id: 'WS-013', name: 'Aurora Flats', region: 'Tundra', lat: 69.7012, lon: -128.1027, elevation: 84 },
  { id: 'WS-014', name: 'Echo Plateau', region: 'Highland Plateau', lat: 45.8134, lon: -110.4127, elevation: 2284 },
  { id: 'WS-015', name: 'Windhaven Plateau', region: 'Highland Plateau', lat: 46.2812, lon: -111.8901, elevation: 2198 },
]

const FORCED_OFFLINE_IDS = new Set(['WS-003', 'WS-011'])

// Deterministic pseudo-random generator — keeps the mock reproducible.
function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function pickState(r) {
  // Weighted pick: most running, some collecting, a sprinkle of the rest.
  const x = r()
  if (x < 0.45) return 'Running'
  if (x < 0.6) return 'Collecting'
  if (x < 0.7) return 'Summarizing'
  if (x < 0.78) return 'Transmitting'
  if (x < 0.86) return 'Powersave'
  if (x < 0.9) return 'Testing'
  if (x < 0.94) return 'Configuring'
  if (x < 0.97) return 'Controlled'
  return 'Shutdown'
}

function instrumentStatus(r) {
  const x = r()
  if (x < 0.85) return 'OK'
  if (x < 0.97) return 'Warning'
  return 'Failed'
}

function buildStations() {
  return LOCATIONS.map((loc, i) => {
    const r = mulberry32(1337 + i * 17)
    const generatedState = pickState(r)
    const state = FORCED_OFFLINE_IDS.has(loc.id)
      ? 'Shutdown'
      : generatedState === 'Shutdown'
        ? 'Running'
        : generatedState
    const online = state !== 'Shutdown'
    const hasWarning = r() < 0.22 || state === 'Configuring' || state === 'Testing'

    const airTemp = +(r() * 30 - 5).toFixed(1) // -5 .. 25
    const groundTemp = +(airTemp - 1 - r() * 3).toFixed(1)
    const pressure = +(990 + r() * 35).toFixed(1) // 990..1025 hPa
    const windSpeed = +(r() * 22).toFixed(1) // 0..22 m/s
    const windDir = Math.floor(r() * 360)
    const rainfall = +(r() * 6).toFixed(2)
    const battery = Math.floor(40 + r() * 60)
    const lastUpdateMinutesAgo = online ? Math.floor(r() * 4) : Math.floor(25 + r() * 400)
    const lastSync = new Date(Date.now() - lastUpdateMinutesAgo * 60 * 1000).toISOString()

    return {
      id: loc.id,
      name: loc.name,
      region: loc.region,
      coordinates: { lat: loc.lat, lon: loc.lon },
      elevation: loc.elevation,
      state,
      online,
      hasWarning: online && hasWarning,
      battery,
      softwareVersion: `4.${2 + Math.floor(r() * 4)}.${Math.floor(r() * 10)}`,
      lastSync,
      metrics: {
        airTemperature: {
          current: airTemp,
          min: +(airTemp - 3 - r() * 4).toFixed(1),
          max: +(airTemp + 3 + r() * 4).toFixed(1),
          avg: +(airTemp - 0.5 + r()).toFixed(1),
          unit: '°C',
          trend: r() < 0.5 ? 'up' : 'down',
        },
        groundTemperature: {
          current: groundTemp,
          min: +(groundTemp - 2 - r() * 2).toFixed(1),
          max: +(groundTemp + 2 + r() * 2).toFixed(1),
          avg: +(groundTemp + r() * 0.4).toFixed(1),
          unit: '°C',
          trend: r() < 0.5 ? 'up' : 'down',
        },
        pressure: {
          current: pressure,
          min: +(pressure - 4 - r() * 3).toFixed(1),
          max: +(pressure + 4 + r() * 3).toFixed(1),
          avg: +(pressure - 0.5 + r()).toFixed(1),
          unit: 'hPa',
          trend: r() < 0.5 ? 'up' : 'down',
        },
        windSpeed: {
          current: windSpeed,
          min: +(Math.max(0, windSpeed - 4 - r() * 3)).toFixed(1),
          max: +(windSpeed + 5 + r() * 5).toFixed(1),
          avg: +(Math.max(0, windSpeed - 1 + r())).toFixed(1),
          unit: 'm/s',
          trend: r() < 0.5 ? 'up' : 'down',
        },
        windDirection: {
          current: windDir,
          unit: '°',
        },
        rainfall: {
          total24h: rainfall,
          total7d: +(rainfall * (2 + r() * 4)).toFixed(2),
          unit: 'mm',
        },
      },
      instruments: {
        groundThermometer: {
          name: 'Ground Thermometer',
          status: instrumentStatus(r),
          lastReading: groundTemp,
          unit: '°C',
        },
        anemometer: {
          name: 'Anemometer',
          status: instrumentStatus(r),
          lastReading: windSpeed,
          unit: 'm/s',
        },
        barometer: {
          name: 'Barometer',
          status: instrumentStatus(r),
          lastReading: pressure,
          unit: 'hPa',
        },
      },
    }
  })
}

export const MOCK_STATIONS = buildStations()

// ————————————————————————————————————————————————————————
// Time-series generators (deterministic per station + metric)
// ————————————————————————————————————————————————————————
function seedFor(stationId, key) {
  let h = 0
  const s = stationId + ':' + key
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function generateSeries(stationId, metric, hours = 24, stepMinutes = 15) {
  const r = mulberry32(seedFor(stationId, metric))
  const stepMs = stepMinutes * 60 * 1000
  const points = Math.floor((hours * 60) / stepMinutes)
  const now = Math.floor(Date.now() / stepMs) * stepMs
  const base = {
    airTemperature: 12,
    groundTemperature: 10,
    pressure: 1012,
    windSpeed: 6,
  }[metric] ?? 10
  const amp = {
    airTemperature: 6,
    groundTemperature: 4,
    pressure: 5,
    windSpeed: 8,
  }[metric] ?? 4

  const out = []
  let v = base + (r() - 0.5) * amp
  for (let i = points - 1; i >= 0; i--) {
    const t = now - i * stepMinutes * 60 * 1000
    // sinusoidal daily cycle + random walk
    const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60
    const cycle = Math.sin((hour / 24) * Math.PI * 2) * (amp / 3)
    v += (r() - 0.5) * (amp / 6)
    const value = +(base + cycle + v - base).toFixed(2)
    out.push({
      t,
      time: new Date(t).toISOString(),
      value,
    })
  }
  return out
}

export function generateRainfall7d(stationId) {
  const r = mulberry32(seedFor(stationId, 'rainfall'))
  const out = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    out.push({
      t: d.getTime(),
      day: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: +(r() * 8).toFixed(2),
    })
  }
  return out
}

// ————————————————————————————————————————————————————————
// Alerts & activity log
// ————————————————————————————————————————————————————————
const ALERT_TYPES = [
  'temperature_high',
  'temperature_critical',
  'temperature_freezing',
  'battery_low',
  'battery_critical',
  'signal_weak',
  'signal_lost',
  'wind_strong',
  'wind_storm',
  'station_shutdown',
  'station_connection_lost',
]
const SEVERITIES = ['info', 'warning', 'critical']
const STATUSES = ['new', 'acknowledged']

export const MOCK_ALERTS = (() => {
  const r = mulberry32(42)
  const out = []
  for (let i = 0; i < 28; i++) {
    const station = MOCK_STATIONS[Math.floor(r() * MOCK_STATIONS.length)]
    const type = ALERT_TYPES[Math.floor(r() * ALERT_TYPES.length)]
    const severity = SEVERITIES[Math.floor(r() * SEVERITIES.length)]
    const status = r() < 0.25 ? 'new' : r() < 0.6 ? 'acknowledged' : 'resolved'
    const minutesAgo = Math.floor(r() * 60 * 24 * 3)
    out.push({
      id: `ALT-${1000 + i}`,
      stationId: station.id,
      stationName: station.name,
      type,
      severity,
      status,
      message: alertMessage(type, station),
      timestamp: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
    })
  }
  return out.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})()

function alertMessage(type, station) {
  switch (type) {
    case 'sensor failure':
      return `Sensor stopped reporting on ${station.name}.`
    case 'connection lost':
      return `Lost telemetry link with ${station.id}.`
    case 'battery low':
      return `Battery below 30% at ${station.name}.`
    case 'data anomaly':
      return `Readings out of expected range at ${station.name}.`
    default:
      return `Event at ${station.name}.`
  }
}

const EVENT_TYPES = [
  'command.restart',
  'command.shutdown',
  'command.powersave',
  'command.reconfigure',
  'command.remote',
  'command.reset_battery',
  'command.stabilize_signal',
  'command.calibrate_instruments',
  'command.close_alerts',
  'system.station.registered',
  'system.station.updated',
  'system.station.decommissioned',
  'system.firmware.update',
  'status.changed',
  'alert.acknowledged',
  'alert.acknowledged.clear',
]

export const MOCK_ACTIVITY = (() => {
  const r = mulberry32(101)
  const out = []
  for (let i = 0; i < 60; i++) {
    const station = MOCK_STATIONS[Math.floor(r() * MOCK_STATIONS.length)]
    const type = EVENT_TYPES[Math.floor(r() * EVENT_TYPES.length)]
    const minutesAgo = Math.floor(r() * 60 * 24 * 5)
    out.push({
      id: `EV-${2000 + i}`,
      stationId: station.id,
      stationName: station.name,
      type,
      actor: r() < 0.5 ? 'operator@wws' : 'system',
      message: eventMessage(type, station),
      timestamp: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
    })
  }
  return out.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})()

function eventMessage(type, station) {
  switch (type) {
    case 'command.restart':
      return `Restart command issued to ${station.id}.`
    case 'command.shutdown':
      return `Shutdown command issued to ${station.id}.`
    case 'command.powersave':
      return `Power-save toggled on ${station.id}.`
    case 'command.reconfigure':
      return `New configuration uploaded to ${station.id}.`
    case 'command.remote':
      return `Remote command dispatched to ${station.id}.`
    case 'command.reset_battery':
      return `Battery telemetry reset on ${station.id}.`
    case 'command.stabilize_signal':
      return `Radio link stabilized on ${station.id}.`
    case 'command.calibrate_instruments':
      return `Instrument calibration completed on ${station.id}.`
    case 'command.close_alerts':
      return `Reviewed alerts closed on ${station.id}.`
    case 'system.station.registered':
      return `${station.id} was added to the monitoring registry.`
    case 'system.station.decommissioned':
      return `${station.id} was decommissioned from active monitoring.`
    case 'system.autorestart':
      return `${station.id} auto-restarted after watchdog trip.`
    case 'system.heartbeat':
      return `Heartbeat received from ${station.id}.`
    case 'system.firmware.update':
      return `Firmware updated on ${station.id} to ${station.softwareVersion}.`
    default:
      return `Event on ${station.id}.`
  }
}

// ————————————————————————————————————————————————————————
// Software update history per station
// ————————————————————————————————————————————————————————
export function mockUpdateHistory(stationId) {
  const r = mulberry32(seedFor(stationId, 'updates'))
  const out = []
  const versions = ['4.2.1', '4.3.0', '4.4.2', '4.5.0', '4.5.1']
  for (let i = 0; i < 4; i++) {
    const daysAgo = 5 + i * 9 + Math.floor(r() * 5)
    out.push({
      version: versions[i],
      installedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      status: i === 3 ? 'rolled-back' : 'success',
      notes: i === 3 ? 'Rolled back due to calibration drift.' : 'Applied cleanly.',
    })
  }
  return out
}

export { STATES, REGIONS, ALERT_TYPES, SEVERITIES, STATUSES, EVENT_TYPES }
