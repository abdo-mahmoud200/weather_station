import type { ReadingRow } from './Reading'

export type EgyptRegion =
  | 'Western Desert'
  | 'Eastern Desert'
  | 'South Sinai Mtn'
  | 'South Sinai'
  | 'Sinai Coast'
  | 'Red Sea Coast'
  | 'Upper Egypt'

export type StationStatus =
  | 'RUNNING'
  | 'COLLECTING'
  | 'TRANSMITTING'
  | 'POWERSAVE'
  | 'CONFIGURING'
  | 'CONTROLLED'
  | 'SHUTDOWN'

export interface StationRow {
  id: string
  name: string
  name_ar: string
  region: EgyptRegion
  lat: number
  lng: number
  elevation: number
  status: StationStatus
  battery: number
  signal: number
  installed_at: string
  active: number
  software_version: string
  notes: string
  decommissioned_at: string | null
}

export interface StationWithLatest extends StationRow {
  latest_reading: ReadingRow | null
  active_alerts_count: number
  online: boolean
}

export interface ClimateProfile {
  airTemp: { min: number; max: number; base: number }
  windSpeed: { min: number; max: number; base: number }
  humidity: { min: number; max: number; base: number }
  rainfall: { chance: number }
  sunshine: { min: number; max: number; base: number }
}

export const VALID_REGIONS: EgyptRegion[] = [
  'Western Desert',
  'Eastern Desert',
  'South Sinai Mtn',
  'South Sinai',
  'Sinai Coast',
  'Red Sea Coast',
  'Upper Egypt',
]

export const CLIMATE_PROFILES: Record<EgyptRegion, ClimateProfile> = {
  'Western Desert': {
    airTemp: { min: 5, max: 48, base: 32 },
    windSpeed: { min: 2, max: 30, base: 8 },
    humidity: { min: 5, max: 25, base: 12 },
    rainfall: { chance: 0.01 },
    sunshine: { min: 80, max: 100, base: 92 },
  },
  'Eastern Desert': {
    airTemp: { min: 8, max: 45, base: 30 },
    windSpeed: { min: 3, max: 20, base: 9 },
    humidity: { min: 10, max: 35, base: 20 },
    rainfall: { chance: 0.02 },
    sunshine: { min: 75, max: 98, base: 88 },
  },
  'South Sinai Mtn': {
    airTemp: { min: -10, max: 35, base: 15 },
    windSpeed: { min: 4, max: 22, base: 11 },
    humidity: { min: 15, max: 55, base: 30 },
    rainfall: { chance: 0.05 },
    sunshine: { min: 60, max: 90, base: 78 },
  },
  'South Sinai': {
    airTemp: { min: 5, max: 40, base: 25 },
    windSpeed: { min: 3, max: 18, base: 8 },
    humidity: { min: 20, max: 60, base: 35 },
    rainfall: { chance: 0.03 },
    sunshine: { min: 65, max: 92, base: 82 },
  },
  'Sinai Coast': {
    airTemp: { min: 15, max: 42, base: 28 },
    windSpeed: { min: 5, max: 22, base: 12 },
    humidity: { min: 35, max: 75, base: 55 },
    rainfall: { chance: 0.02 },
    sunshine: { min: 70, max: 95, base: 85 },
  },
  'Red Sea Coast': {
    airTemp: { min: 18, max: 44, base: 30 },
    windSpeed: { min: 6, max: 25, base: 14 },
    humidity: { min: 40, max: 80, base: 60 },
    rainfall: { chance: 0.01 },
    sunshine: { min: 80, max: 98, base: 90 },
  },
  'Upper Egypt': {
    airTemp: { min: 8, max: 50, base: 36 },
    windSpeed: { min: 1, max: 10, base: 5 },
    humidity: { min: 5, max: 30, base: 15 },
    rainfall: { chance: 0.005 },
    sunshine: { min: 88, max: 100, base: 95 },
  },
}

export interface SeedStation {
  id: string
  name_ar: string
  name: string
  region: EgyptRegion
  lat: number
  lng: number
  elevation: number
}

export const SEEDED_STATIONS: SeedStation[] = [
  { id: 'EG-001', name_ar: 'واحة سيوة', name: 'Siwa Oasis', region: 'Western Desert', lat: 29.2037, lng: 25.52, elevation: 18 },
  { id: 'EG-002', name_ar: 'الفرافرة', name: 'Farafra', region: 'Western Desert', lat: 27.0578, lng: 27.9722, elevation: 150 },
  { id: 'EG-003', name_ar: 'شرق العوينات', name: 'Shark El-Ouinat', region: 'Western Desert', lat: 21.9, lng: 25.1167, elevation: 870 },
  { id: 'EG-004', name_ar: 'وادي الريان', name: 'Wadi El-Rayan', region: 'Western Desert', lat: 29.1833, lng: 30.3833, elevation: 42 },
  { id: 'EG-005', name_ar: 'وادي الجمال', name: 'Wadi El-Gamal', region: 'Eastern Desert', lat: 24.65, lng: 35.1667, elevation: 25 },
  { id: 'EG-006', name_ar: 'وادي حمامات', name: 'Wadi Hammamat', region: 'Eastern Desert', lat: 26, lng: 33.5, elevation: 220 },
  { id: 'EG-007', name_ar: 'جبل الشايب', name: 'Jabal El-Shayeb', region: 'Eastern Desert', lat: 26.9833, lng: 33.4833, elevation: 2187 },
  { id: 'EG-008', name_ar: 'جبل موسى', name: 'Jabal Musa', region: 'South Sinai Mtn', lat: 28.539, lng: 33.975, elevation: 2285 },
  { id: 'EG-009', name_ar: 'وادي فيران', name: 'Wadi Feiran', region: 'South Sinai', lat: 28.7, lng: 33.6333, elevation: 900 },
  { id: 'EG-010', name_ar: 'نبق', name: 'Nabq', region: 'Sinai Coast', lat: 28.03, lng: 34.41, elevation: 5 },
  { id: 'EG-011', name_ar: 'شلاتين', name: 'Shalatin', region: 'Red Sea Coast', lat: 23.1333, lng: 35.5833, elevation: 10 },
  { id: 'EG-012', name_ar: 'حلايب', name: 'Halayeb', region: 'Red Sea Coast', lat: 22.2, lng: 36.6333, elevation: 15 },
  { id: 'EG-013', name_ar: 'أبو سمبل', name: 'Abu Simbel', region: 'Upper Egypt', lat: 22.3372, lng: 31.6258, elevation: 180 },
  { id: 'EG-014', name_ar: 'وادي حلفا', name: 'Wadi Halfa Area', region: 'Upper Egypt', lat: 21.8, lng: 31.35, elevation: 230 },
  { id: 'EG-015', name_ar: 'الداخلة', name: 'Dakhla', region: 'Western Desert', lat: 25.4886, lng: 29, elevation: 102 },
]

export function isValidRegion(region: string): region is EgyptRegion {
  return VALID_REGIONS.includes(region as EgyptRegion)
}

export function isValidStationStatus(status: string): status is StationStatus {
  return ['RUNNING', 'COLLECTING', 'TRANSMITTING', 'POWERSAVE', 'CONFIGURING', 'CONTROLLED', 'SHUTDOWN'].includes(status)
}

export function normalizeStationStatus(status: string): StationStatus {
  const normalized = String(status || '').trim().toUpperCase()
  return isValidStationStatus(normalized) ? normalized : 'RUNNING'
}
