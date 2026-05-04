import { v4 as uuidv4 } from 'uuid'
import { db } from '../config/database'
import {
  CLIMATE_PROFILES,
  type ClimateProfile,
  type EgyptRegion,
  type StationRow,
  type StationStatus,
  normalizeStationStatus,
} from '../models/Station'
import { degreesToCompass, type NewReading, type ReadingRow } from '../models/Reading'
import { emitToAll, emitToStation } from '../websocket/wsServer'
import { logActivity } from './activityLog'
import { evaluateReadingAlerts, evaluateStationAlerts } from './alertEngine'
import { evaluateKhamaseen, finalizeKhamaseenTick, removeStationKhamaseen } from './khamaseenEvents'
import { advanceStationCycle, createStationState, forceStatus, type StationState } from './statusManager'

const TICK_MS = 300_000
const MAX_READINGS_PER_STATION = 300

const runtime = new Map<string, StationState>()
let interval: NodeJS.Timeout | null = null

type CommandName =
  | 'shutdown'
  | 'restart'
  | 'reset_battery'
  | 'powersave'
  | 'reconfigure'
  | 'remote'
  | 'stabilize_signal'
  | 'calibrate_instruments'
  | 'close_alerts'
  | 'software_update'

export interface StationCommandInput {
  command: CommandName | string
  enabled?: boolean
  settings?: Record<string, unknown>
  instrument?: string
  action?: string
  fileName?: string
}

export interface StationCommandResult {
  ok: true
  command: string
  stationId: string
  message: string
  response?: string
  station: StationRow
  timestamp: string
}

export function startSimulator(): void {
  loadRuntimeFromDatabase()

  if (interval) clearInterval(interval)
  runSimulationTick()
  interval = setInterval(runSimulationTick, TICK_MS)
}

export function stopSimulator(): void {
  if (!interval) return
  clearInterval(interval)
  interval = null
}

export function syncStationInSimulator(station: StationRow): void {
  if (!station.active) {
    removeStationFromSimulator(station.id)
    return
  }

  runtime.set(station.id, createStationState(station.id, normalizeStationStatus(station.status)))
}

export function removeStationFromSimulator(stationId: string): void {
  runtime.delete(stationId)
  removeStationKhamaseen(stationId)
}

export function handleStationCommand(stationId: string, input: StationCommandInput): StationCommandResult {
  const station = getActiveStation(stationId)
  if (!station) throw new Error(`Station not found: ${stationId}`)

  const command = normalizeCommand(input.command)
  const state = ensureRuntimeState(station)
  const timestamp = new Date().toISOString()

  switch (command) {
    case 'shutdown':
      applyStatus(station, state, 'SHUTDOWN', { shutdownReason: 'manual' })
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.shutdown',
        actor: 'operator',
        message: `Shutdown command issued to ${station.id}. Station moved to safe standby.`,
      })
      evaluateStationAlerts({ ...station, status: 'SHUTDOWN' })
      return commandResult(station.id, command, 'Station shutdown accepted.', timestamp)

    case 'restart':
      if (state.status !== 'SHUTDOWN') {
        throw new Error(`Cannot restart ${station.id}: station is currently ${state.status}, not SHUTDOWN.`)
      }
      updateStationBattery(station.id, Math.max(0, station.battery - 1))
      applyStatus(station, state, 'COLLECTING', { powerSave: false })
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.restart',
        actor: 'operator',
        message: `Restart command issued to ${station.id}. Telemetry cycle restarted.`,
      })
      return commandResult(station.id, command, 'Station restart accepted.', timestamp)

    case 'reset_battery':
      updateStationBattery(station.id, 100)
      if (state.status === 'SHUTDOWN') {
        applyStatus(station, state, 'RUNNING', { powerSave: false })
      }
      closeStationAlertTypes(station.id, ['battery_low', 'battery_critical'])
      insertMaintenanceReading(station, timestamp, { battery: 100 })
      emitStationMaintenanceUpdate(station.id, timestamp)
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.reset_battery',
        actor: 'operator',
        message: `Battery reset command issued to ${station.id}. Battery set to 100%.`,
      })
      return commandResult(station.id, command, 'Battery reset to 100%.', timestamp)

    case 'stabilize_signal':
      updateStationSignal(station.id, 90)
      if (state.status === 'SHUTDOWN') {
        applyStatus(station, state, 'RUNNING', { powerSave: false })
      }
      closeStationAlertTypes(station.id, ['signal_weak', 'signal_lost', 'station_connection_lost'])
      insertMaintenanceReading(station, timestamp, { signal: 90 })
      emitStationMaintenanceUpdate(station.id, timestamp)
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.stabilize_signal',
        actor: 'operator',
        message: `Radio link stabilized for ${station.id}. Signal restored to safe range.`,
      })
      return commandResult(station.id, command, 'Signal link stabilized.', timestamp)

    case 'calibrate_instruments':
      removeStationKhamaseen(station.id)
      closeStationAlertTypes(station.id, [
        'temperature_high',
        'temperature_critical',
        'temperature_freezing',
        'wind_strong',
        'wind_storm',
      ])
      insertMaintenanceReading(station, timestamp, safeInstrumentOverrides(station))
      emitStationMaintenanceUpdate(station.id, timestamp)
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.calibrate_instruments',
        actor: 'operator',
        message: `Instrument calibration completed for ${station.id}. Telemetry returned to safe range.`,
      })
      return commandResult(station.id, command, 'Instrument calibration completed.', timestamp)

    case 'close_alerts':
      closeAllStationAlerts(station.id)
      emitStationMaintenanceUpdate(station.id, timestamp)
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.close_alerts',
        actor: 'operator',
        message: `Reviewed station alerts closed for ${station.id}.`,
      })
      return commandResult(station.id, command, 'Station alerts closed.', timestamp)

    case 'powersave': {
      const enabled = typeof input.enabled === 'boolean' ? input.enabled : state.status !== 'POWERSAVE'
      applyStatus(station, state, enabled ? 'POWERSAVE' : 'RUNNING', { powerSave: enabled })
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.powersave',
        actor: 'operator',
        message: enabled
          ? `Power-save mode enabled on ${station.id}.`
          : `Power-save mode disabled on ${station.id}.`,
      })
      return commandResult(station.id, command, enabled ? 'Power-save enabled.' : 'Power-save disabled.', timestamp)
    }

    case 'reconfigure':
      applyStatus(station, state, 'CONFIGURING', { powerSave: false, ticks: 2 })
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.reconfigure',
        actor: 'operator',
        message: `Configuration package applied to ${station.id}: ${stringifySettings(input.settings)}`,
      })
      return commandResult(station.id, command, 'Configuration package accepted.', timestamp)

    case 'remote': {
      applyStatus(station, state, 'CONTROLLED', { ticks: 1 })
      const response = buildRemoteResponse(station, input, timestamp)
      logActivity({
        stationId: station.id,
        stationName: station.name,
        type: 'command.remote',
        actor: 'operator',
        message: `Remote command sent to ${input.instrument || 'station'} on ${station.id}.`,
      })
      return {
        ...commandResult(station.id, command, 'Remote command executed.', timestamp),
        response,
      }
    }

    case 'software_update':
      return applySoftwareUpdate(station, state, input.fileName || 'firmware.bin', timestamp)

    default:
      throw new Error(`Unsupported command: ${input.command}`)
  }
}

function runSimulationTick(): void {
  const stations = db.prepare('SELECT * FROM stations WHERE active = 1 ORDER BY id ASC').all() as StationRow[]

  for (const station of stations) {
    const state = ensureRuntimeState(station)
    const battery = calculateBattery(station.region, station.battery, state.powerSave)
    const transition = advanceStationCycle(state, battery)

    if (transition.changed) {
      persistStatusChange(station, transition.oldStatus, transition.newStatus)
    }

    const effectiveStation = {
      ...station,
      status: state.status,
      battery,
    }

    if (state.status === 'SHUTDOWN') {
      db.prepare('UPDATE stations SET status = ?, battery = ? WHERE id = ?').run(state.status, battery, station.id)
      evaluateStationAlerts(effectiveStation)
      console.log(`[sim] ${station.id} temp=-- status=${state.status}`)
      continue
    }

    const previous = getLatestReading(station.id)
    const khamaseen = evaluateKhamaseen(effectiveStation)
    const readingInput = generateReading(effectiveStation, previous, battery, khamaseen.active)
    const reading = insertReading(readingInput)

    db.prepare('UPDATE stations SET status = ?, battery = ?, signal = ? WHERE id = ?').run(
      state.status,
      reading.battery,
      reading.signal,
      station.id,
    )

    evaluateReadingAlerts({ ...effectiveStation, battery: reading.battery, signal: reading.signal }, reading)

    emitToStation(station.id, 'reading:new', { stationId: station.id, reading })

    trimOldReadings(station.id)
    finalizeKhamaseenTick(station.id, khamaseen.endedAfterTick)

    console.log(`[sim] ${station.id} temp=${reading.air_temp.toFixed(1)}C status=${state.status}`)
  }

  emitToAll('stations:updated', { timestamp: new Date().toISOString() })
}

function loadRuntimeFromDatabase(): void {
  runtime.clear()
  const stations = db.prepare('SELECT * FROM stations WHERE active = 1').all() as StationRow[]
  for (const station of stations) {
    runtime.set(station.id, createStationState(station.id, normalizeStationStatus(station.status)))
  }
}

function ensureRuntimeState(station: StationRow): StationState {
  const existing = runtime.get(station.id)
  if (existing) return existing

  const state = createStationState(station.id, normalizeStationStatus(station.status))
  runtime.set(station.id, state)
  return state
}

function applyStatus(
  station: StationRow,
  state: StationState,
  status: StationStatus,
  options: Parameters<typeof forceStatus>[2] = {},
): void {
  const transition = forceStatus(state, status, options)
  db.prepare('UPDATE stations SET status = ? WHERE id = ?').run(state.status, station.id)

  if (transition.changed) {
    emitToAll('status:changed', {
      stationId: station.id,
      oldStatus: transition.oldStatus,
      newStatus: transition.newStatus,
    })
    emitToAll('stations:updated', { timestamp: new Date().toISOString() })
  }
}

function persistStatusChange(station: StationRow, oldStatus: StationStatus, newStatus: StationStatus): void {
  db.prepare('UPDATE stations SET status = ? WHERE id = ?').run(newStatus, station.id)
  emitToAll('status:changed', { stationId: station.id, oldStatus, newStatus })
  logActivity({
    stationId: station.id,
    stationName: station.name,
    type: 'status.changed',
    message: `${station.id} changed status from ${oldStatus} to ${newStatus}.`,
  })
}

function generateReading(
  station: StationRow,
  previous: ReadingRow | undefined,
  battery: number,
  khamaseenActive: boolean,
): NewReading {
  const profile = CLIMATE_PROFILES[station.region]
  const pressureBase = 1013 - station.elevation / 115 - Math.max(0, profile.airTemp.base - 25) * 0.25
  const signalBase = signalBaseForStation(station.id)

  let airTemp = driftValue(previous?.air_temp, profile.airTemp.base, 4.4, profile.airTemp.min, profile.airTemp.max)
  let windSpeed = driftValue(previous?.wind_speed, profile.windSpeed.base, 3.2, profile.windSpeed.min, profile.windSpeed.max)
  let humidity = driftValue(previous?.humidity, profile.humidity.base, 4.6, profile.humidity.min, profile.humidity.max)
  let sunshine = driftValue(previous?.sunshine, profile.sunshine.base, 5.5, profile.sunshine.min, profile.sunshine.max)
  let pressure = driftValue(previous?.pressure, pressureBase, 2.2, 980, 1025)
  let signal = driftValue(previous?.signal ?? station.signal, signalBase, 6.5, 5, 100)

  if (khamaseenActive) {
    windSpeed = randomBetween(20, 35)
    humidity = randomBetween(4, 9.5)
    sunshine = randomBetween(10, 30)
    airTemp = clamp(airTemp + randomBetween(5, 10), profile.airTemp.min, profile.airTemp.max + 3)
    signal = clamp(signal - randomBetween(2, 8), 5, 100)
    pressure = clamp(pressure - randomBetween(2, 7), 975, 1025)
  }

  const rainfall = Math.random() < profile.rainfall.chance ? round(randomBetween(0.2, station.region === 'South Sinai Mtn' ? 6 : 3), 2) : 0
  const groundTemp = calculateGroundTemp(airTemp)

  return {
    station_id: station.id,
    air_temp: round(airTemp, 1),
    ground_temp: round(groundTemp, 1),
    wind_speed: round(Math.max(0, windSpeed), 1),
    wind_direction: degreesToCompass(randomBetween(0, 359)),
    pressure: round(pressure, 1),
    rainfall,
    sunshine: round(sunshine, 1),
    humidity: round(humidity, 1),
    battery: round(battery, 2),
    signal: round(signal, 1),
    timestamp: new Date().toISOString(),
  }
}

function insertReading(reading: NewReading): ReadingRow {
  const result = db
    .prepare(
      `INSERT INTO readings (
        station_id, air_temp, ground_temp, wind_speed, wind_direction, pressure, rainfall,
        sunshine, humidity, battery, signal, timestamp
      ) VALUES (
        @station_id, @air_temp, @ground_temp, @wind_speed, @wind_direction, @pressure, @rainfall,
        @sunshine, @humidity, @battery, @signal, @timestamp
      )`,
    )
    .run(reading)

  return {
    id: Number(result.lastInsertRowid),
    ...reading,
  }
}

function getLatestReading(stationId: string): ReadingRow | undefined {
  return db
    .prepare('SELECT * FROM readings WHERE station_id = ? ORDER BY timestamp DESC LIMIT 1')
    .get(stationId) as ReadingRow | undefined
}

function getActiveStation(stationId: string): StationRow | undefined {
  return db.prepare('SELECT * FROM stations WHERE id = ? AND active = 1').get(stationId) as StationRow | undefined
}

function commandResult(stationId: string, command: string, message: string, timestamp: string): StationCommandResult {
  const station = getActiveStation(stationId)
  if (!station) throw new Error(`Station not found: ${stationId}`)

  return {
    ok: true,
    command,
    stationId,
    message,
    station,
    timestamp,
  }
}

function applySoftwareUpdate(
  station: StationRow,
  state: StationState,
  fileName: string,
  timestamp: string,
): StationCommandResult {
  const nextVersion = bumpVersion(station.software_version)
  db.prepare('UPDATE stations SET software_version = ?, status = ? WHERE id = ?').run(nextVersion, 'CONFIGURING', station.id)
  db.prepare(
    `INSERT INTO software_updates (id, station_id, version, file_name, status, notes, installed_at)
     VALUES (?, ?, ?, ?, 'success', ?, ?)`,
  ).run(uuidv4(), station.id, nextVersion, fileName, `Installed ${fileName}.`, timestamp)

  forceStatus(state, 'CONFIGURING', { powerSave: false, ticks: 2 })

  logActivity({
    stationId: station.id,
    stationName: station.name,
    type: 'system.firmware.update',
    actor: 'operator',
    message: `Firmware updated on ${station.id} to ${nextVersion} from ${fileName}.`,
  })

  emitToAll('station:updated', { station: getActiveStation(station.id) })
  emitToAll('stations:updated', { timestamp })

  return commandResult(station.id, 'software_update', `Software updated to ${nextVersion}.`, timestamp)
}

function normalizeCommand(command: string): CommandName {
  const normalized = String(command || '').trim().toLowerCase()
  if (normalized === 'remote_control') return 'remote'
  if (normalized === 'software' || normalized === 'upload_software') return 'software_update'

  const commands: CommandName[] = [
    'shutdown',
    'restart',
    'reset_battery',
    'powersave',
    'reconfigure',
    'remote',
    'stabilize_signal',
    'calibrate_instruments',
    'close_alerts',
    'software_update',
  ]
  if (commands.includes(normalized as CommandName)) return normalized as CommandName
  return normalized as CommandName
}

function updateStationBattery(stationId: string, battery: number): void {
  db.prepare('UPDATE stations SET battery = ? WHERE id = ?').run(round(clamp(battery, 0, 100), 2), stationId)
}

function updateStationSignal(stationId: string, signal: number): void {
  db.prepare('UPDATE stations SET signal = ? WHERE id = ?').run(round(clamp(signal, 0, 100), 1), stationId)
}

function calculateBattery(region: EgyptRegion, battery: number, powerSave: boolean): number {
  const drain = regionDrain(region) * (powerSave ? 0.45 : 1)
  const cairoHour = (new Date().getUTCHours() + 2) % 24
  const daytime = cairoHour >= 6 && cairoHour < 18
  const charge = highSunRegion(region) ? 0.075 : 0.05
  const delta = daytime ? charge - drain : -0.01 - drain
  return round(clamp(battery + delta, 0, 100), 2)
}

function regionDrain(region: EgyptRegion): number {
  if (region === 'Western Desert' || region === 'Upper Egypt') return 0.015
  if (region === 'Eastern Desert' || region === 'Red Sea Coast') return 0.012
  return 0.01
}

function highSunRegion(region: EgyptRegion): boolean {
  return region === 'Western Desert' || region === 'Upper Egypt'
}

function signalBaseForStation(stationId: string): number {
  if (stationId === 'EG-003' || stationId === 'EG-014') return randomBetween(50, 70)
  if (stationId === 'EG-007' || stationId === 'EG-008') return randomBetween(55, 75)
  return randomBetween(70, 95)
}

function driftValue(previous: number | undefined, base: number, std: number, min: number, max: number): number {
  const start = typeof previous === 'number' ? previous : gaussianRandom(base, std)
  const next = start + gaussianRandom(0, std) * 0.3 + (base - start) * 0.05
  return clamp(next, min, max)
}

function calculateGroundTemp(airTemp: number): number {
  const cairoHour = (new Date().getUTCHours() + 2) % 24
  const daytimeBias = cairoHour >= 8 && cairoHour < 17 ? randomBetween(1.5, 5.5) : -randomBetween(0.5, 2.5)
  return airTemp + daytimeBias
}

function gaussianRandom(mean: number, std: number): number {
  const u = 1 - Math.random()
  const v = Math.random()
  return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std
}

function buildRemoteResponse(station: StationRow, input: StationCommandInput, timestamp: string): string {
  const latest = getLatestReading(station.id)
  const instrument = input.instrument || 'station'
  const action = input.action || 'status'

  const body: Record<string, string> = {
    anemometer: `OK: wind=${latest?.wind_speed?.toFixed(1) ?? '--'} m/s direction=${latest?.wind_direction ?? '--'}`,
    barometer: `OK: p=${latest?.pressure?.toFixed(1) ?? '--'} hPa`,
    groundThermometer: `OK: ground=${latest?.ground_temp?.toFixed(1) ?? '--'} C`,
    thermometer: `OK: air=${latest?.air_temp?.toFixed(1) ?? '--'} C`,
    station: `OK: status=${station.status} battery=${station.battery.toFixed(1)} signal=${station.signal.toFixed(1)}`,
  }

  return `[${timestamp}] -> ${instrument}.${action}\n[${timestamp}] <- ${body[instrument] || 'OK'}`
}

function insertMaintenanceReading(
  station: StationRow,
  timestamp: string,
  overrides: Partial<NewReading>,
): ReadingRow {
  const latest = getLatestReading(station.id)
  const profile = CLIMATE_PROFILES[station.region]
  const pressureBase = clamp(1013 - station.elevation / 115, 990, 1022)

  const reading = insertReading({
    station_id: station.id,
    air_temp: round(Number(overrides.air_temp ?? latest?.air_temp ?? profile.airTemp.base), 1),
    ground_temp: round(Number(overrides.ground_temp ?? latest?.ground_temp ?? profile.airTemp.base + 2), 1),
    wind_speed: round(Number(overrides.wind_speed ?? latest?.wind_speed ?? profile.windSpeed.base), 1),
    wind_direction: String(overrides.wind_direction ?? latest?.wind_direction ?? 'N'),
    pressure: round(Number(overrides.pressure ?? latest?.pressure ?? pressureBase), 1),
    rainfall: round(Number(overrides.rainfall ?? latest?.rainfall ?? 0), 2),
    sunshine: round(Number(overrides.sunshine ?? latest?.sunshine ?? profile.sunshine.base), 1),
    humidity: round(Number(overrides.humidity ?? latest?.humidity ?? profile.humidity.base), 1),
    battery: round(Number(overrides.battery ?? station.battery), 2),
    signal: round(Number(overrides.signal ?? station.signal), 1),
    timestamp,
  })

  db.prepare('UPDATE stations SET battery = ?, signal = ? WHERE id = ?').run(
    reading.battery,
    reading.signal,
    station.id,
  )

  return reading
}

function safeInstrumentOverrides(station: StationRow): Partial<NewReading> {
  const profile = CLIMATE_PROFILES[station.region]
  const safeAir = clamp(profile.airTemp.base, profile.airTemp.min, Math.min(profile.airTemp.max, 42))

  return {
    air_temp: round(safeAir, 1),
    ground_temp: round(clamp(safeAir + 2, -5, 45), 1),
    wind_speed: round(clamp(profile.windSpeed.base, profile.windSpeed.min, Math.min(profile.windSpeed.max, 14)), 1),
    pressure: round(clamp(1013 - station.elevation / 115, 990, 1022), 1),
  }
}

function closeStationAlertTypes(stationId: string, types: string[]): void {
  for (const type of types) {
    db.prepare('UPDATE alerts SET acknowledged = 1 WHERE station_id = ? AND type = ? AND acknowledged = 0').run(
      stationId,
      type,
    )
  }
}

function closeAllStationAlerts(stationId: string): void {
  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE station_id = ? AND acknowledged = 0').run(stationId)
}

function emitStationMaintenanceUpdate(stationId: string, timestamp: string): void {
  const station = getActiveStation(stationId)
  const reading = getLatestReading(stationId)

  if (reading) {
    emitToStation(stationId, 'reading:new', { stationId, reading })
  }

  if (station) emitToAll('station:updated', { station })
  emitToAll('stations:updated', { timestamp })
}

function stringifySettings(settings: Record<string, unknown> | undefined): string {
  if (!settings || Object.keys(settings).length === 0) return 'default station profile'
  return JSON.stringify(settings)
}

function trimOldReadings(stationId: string): void {
  db.prepare(
    `DELETE FROM readings
     WHERE station_id = ?
       AND id NOT IN (
         SELECT id FROM readings
         WHERE station_id = ?
         ORDER BY timestamp DESC
         LIMIT ?
       )`,
  ).run(stationId, stationId, MAX_READINGS_PER_STATION)
}

function bumpVersion(version: string): string {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10))
  while (parts.length < 3) parts.push(0)
  parts[2] = Number.isFinite(parts[2]) ? parts[2] + 1 : 1
  return parts.map((part) => (Number.isFinite(part) ? part : 0)).join('.')
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits))
}
