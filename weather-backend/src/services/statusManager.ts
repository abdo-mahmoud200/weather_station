import type { StationStatus } from '../models/Station'

export type ShutdownReason = 'battery' | 'manual' | null

export interface StationState {
  stationId: string
  status: StationStatus
  ticksRemaining: number
  powerSave: boolean
  shutdownReason: ShutdownReason
}

export interface StatusTransition {
  oldStatus: StationStatus
  newStatus: StationStatus
  changed: boolean
}

const STATUS_DURATIONS_TICKS: Record<StationStatus, number> = {
  RUNNING: 3,
  COLLECTING: 2,
  TRANSMITTING: 1,
  POWERSAVE: 3,
  CONFIGURING: 2,
  CONTROLLED: 1,
  SHUTDOWN: 0,
}

export function createStationState(stationId: string, status: StationStatus): StationState {
  return {
    stationId,
    status,
    ticksRemaining: STATUS_DURATIONS_TICKS[status],
    powerSave: status === 'POWERSAVE',
    shutdownReason: status === 'SHUTDOWN' ? 'battery' : null,
  }
}

export function forceStatus(
  state: StationState,
  newStatus: StationStatus,
  options: { powerSave?: boolean; shutdownReason?: ShutdownReason; ticks?: number } = {},
): StatusTransition {
  const oldStatus = state.status
  state.status = newStatus
  state.ticksRemaining = options.ticks ?? STATUS_DURATIONS_TICKS[newStatus]

  if (typeof options.powerSave === 'boolean') {
    state.powerSave = options.powerSave
  }

  if (newStatus === 'SHUTDOWN') {
    state.shutdownReason = options.shutdownReason ?? state.shutdownReason ?? 'manual'
  } else {
    state.shutdownReason = null
  }

  return {
    oldStatus,
    newStatus,
    changed: oldStatus !== newStatus,
  }
}

export function advanceStationCycle(state: StationState, battery: number): StatusTransition {
  const oldStatus = state.status

  if (battery < 15) {
    forceStatus(state, 'SHUTDOWN', { shutdownReason: 'battery' })
    return { oldStatus, newStatus: state.status, changed: oldStatus !== state.status }
  }

  if (state.status === 'SHUTDOWN') {
    if (state.shutdownReason === 'battery' && battery > 20) {
      forceStatus(state, 'RUNNING', { powerSave: false })
    }
    return { oldStatus, newStatus: state.status, changed: oldStatus !== state.status }
  }

  if (state.powerSave) {
    if (state.status !== 'POWERSAVE') forceStatus(state, 'POWERSAVE')
    return { oldStatus, newStatus: state.status, changed: oldStatus !== state.status }
  }

  if (state.status === 'CONFIGURING' || state.status === 'CONTROLLED') {
    state.ticksRemaining -= 1
    if (state.ticksRemaining <= 0) {
      forceStatus(state, 'RUNNING')
    }
    return { oldStatus, newStatus: state.status, changed: oldStatus !== state.status }
  }

  state.ticksRemaining -= 1
  if (state.ticksRemaining > 0) {
    return { oldStatus, newStatus: state.status, changed: false }
  }

  const nextStatus = nextCycleStatus(state.status)
  forceStatus(state, nextStatus)

  return { oldStatus, newStatus: state.status, changed: oldStatus !== state.status }
}

function nextCycleStatus(status: StationStatus): StationStatus {
  if (status === 'RUNNING') return 'COLLECTING'
  if (status === 'COLLECTING') return 'TRANSMITTING'
  return 'RUNNING'
}
