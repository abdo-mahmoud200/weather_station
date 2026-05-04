import type { StationRow } from '../models/Station'
import { emitToAll } from '../websocket/wsServer'

interface KhamaseenState {
  stationId: string
  stationName: string
  region: string
  duration: number
  remainingTicks: number
}

export interface KhamaseenResult {
  active: boolean
  duration: number
  endedAfterTick: boolean
}

const khamaseenEvents = new Map<string, KhamaseenState>()
const AFFECTED_REGIONS = new Set(['Western Desert', 'Eastern Desert'])

export function evaluateKhamaseen(station: StationRow, now = new Date()): KhamaseenResult {
  const existing = khamaseenEvents.get(station.id)

  if (existing) {
    existing.remainingTicks -= 1
    const endedAfterTick = existing.remainingTicks <= 0
    if (endedAfterTick) {
      khamaseenEvents.delete(station.id)
    }
    return { active: true, duration: existing.duration, endedAfterTick }
  }

  if (!isKhamaseenSeason(now) || !AFFECTED_REGIONS.has(station.region)) {
    return { active: false, duration: 0, endedAfterTick: false }
  }

  if (Math.random() >= 0.04) {
    return { active: false, duration: 0, endedAfterTick: false }
  }

  const duration = 2 + Math.floor(Math.random() * 3)
  khamaseenEvents.set(station.id, {
    stationId: station.id,
    stationName: station.name,
    region: station.region,
    duration,
    remainingTicks: duration - 1,
  })

  emitToAll('khamaseen:started', {
    stationId: station.id,
    stationName: station.name,
    duration,
  })

  return { active: true, duration, endedAfterTick: duration <= 1 }
}

export function finalizeKhamaseenTick(stationId: string, endedAfterTick: boolean): void {
  if (!endedAfterTick) return
  emitToAll('khamaseen:ended', { stationId })
}

export function getActiveKhamaseenCount(): number {
  return khamaseenEvents.size
}

export function getActiveKhamaseenEvents(): KhamaseenState[] {
  return Array.from(khamaseenEvents.values())
}

export function removeStationKhamaseen(stationId: string): void {
  khamaseenEvents.delete(stationId)
}

function isKhamaseenSeason(now: Date): boolean {
  const month = now.getMonth() + 1
  return month >= 3 && month <= 5
}
