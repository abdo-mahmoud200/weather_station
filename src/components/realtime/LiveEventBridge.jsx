import { useSocketEvents } from '../../hooks/useSocket'
import { useToast } from '../common/Toast'

const IMPORTANT_STATUSES = new Set(['SHUTDOWN', 'POWERSAVE', 'CONFIGURING', 'CONTROLLED'])

export default function LiveEventBridge() {
  const toast = useToast()

  useSocketEvents(
    {
      'alert:new': ({ alert }) => {
        if (!alert) return

        const notify = alert.severity === 'critical' ? toast.error : toast.warning
        notify(alert.message || 'New station alert', {
          title: `${alert.stationId || alert.station_id} | ${alert.severity}`,
          duration: alert.severity === 'critical' ? 8000 : 6000,
        })
      },
      'khamaseen:started': ({ stationId, stationName, duration }) => {
        toast.warning(`Dust wind conditions detected for ${duration} simulation ticks.`, {
          title: `Khamaseen started | ${stationId} ${stationName || ''}`.trim(),
          duration: 8000,
        })
      },
      'khamaseen:ended': ({ stationId }) => {
        toast.info('Wind and visibility readings are returning to the normal profile.', {
          title: `Khamaseen ended | ${stationId}`,
          duration: 5000,
        })
      },
      'station:added': ({ station }) => {
        toast.success(`${station?.id || 'Station'} is now active in monitoring.`, {
          title: 'Station added',
        })
      },
      'station:removed': ({ stationId }) => {
        toast.warning(`${stationId} was removed from active monitoring.`, {
          title: 'Station removed',
        })
      },
      'status:changed': ({ stationId, oldStatus, newStatus }) => {
        if (!IMPORTANT_STATUSES.has(newStatus) && oldStatus !== 'SHUTDOWN') return

        if (newStatus === 'SHUTDOWN') {
          toast.error(`${stationId} entered shutdown state.`, {
            title: 'Station offline',
            duration: 7000,
          })
          return
        }

        if (oldStatus === 'SHUTDOWN') {
          toast.success(`${stationId} recovered from shutdown.`, {
            title: 'Station recovered',
          })
          return
        }

        toast.info(`${stationId} changed status to ${formatStatus(newStatus)}.`, {
          title: 'Status changed',
        })
      },
    },
    [],
  )

  return null
}

function formatStatus(status) {
  return String(status || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
