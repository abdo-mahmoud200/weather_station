export interface ReadingRow {
  id: number
  station_id: string
  air_temp: number
  ground_temp: number
  wind_speed: number
  wind_direction: string
  pressure: number
  rainfall: number
  sunshine: number
  humidity: number
  battery: number
  signal: number
  timestamp: string
}

export interface NewReading {
  station_id: string
  air_temp: number
  ground_temp: number
  wind_speed: number
  wind_direction: string
  pressure: number
  rainfall: number
  sunshine: number
  humidity: number
  battery: number
  signal: number
  timestamp: string
}

export const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export type CompassDirection = (typeof COMPASS_DIRECTIONS)[number]

export function compassToDegrees(direction: string): number {
  const index = COMPASS_DIRECTIONS.indexOf(direction as CompassDirection)
  return index === -1 ? 0 : index * 45
}

export function degreesToCompass(degrees: number): CompassDirection {
  const normalized = ((degrees % 360) + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return COMPASS_DIRECTIONS[index]
}
