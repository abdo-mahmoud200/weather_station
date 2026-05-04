export type AlertSeverity = 'warning' | 'critical'

export interface AlertRow {
  id: string
  station_id: string
  station_name: string
  type: string
  severity: AlertSeverity
  message: string
  value: number
  threshold: number
  acknowledged: number
  timestamp: string
}

export interface AlertResponse extends AlertRow {
  stationId: string
  stationName: string
  status: 'new' | 'acknowledged'
}

export function toAlertResponse(alert: AlertRow): AlertResponse {
  return {
    ...alert,
    stationId: alert.station_id,
    stationName: alert.station_name,
    status: alert.acknowledged ? 'acknowledged' : 'new',
  }
}
