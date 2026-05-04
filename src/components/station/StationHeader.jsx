import { BatteryCharging, ChevronLeft, Clock, MapPin, Satellite } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge, { stateToneMap } from '../common/Badge'
import LiveDot from '../common/LiveDot'
import ProgressBar from '../common/ProgressBar'
import { formatCoordinates, formatDateTime, timeAgo } from '../../utils/formatters'

export default function StationHeader({ station, actions }) {
  if (!station) return null

  const tone = stateToneMap[station.state] || 'neutral'
  const telemetry = getTelemetryProgress(station)

  return (
    <div className="border-b border-bg-border bg-bg-base/40">
      <div className="px-4 py-5 lg:px-6">
        <Link
          to="/"
          className="mb-2 inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={14} /> Back to dashboard
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                {station.id}
              </span>
              <LiveDot tone={station.online ? 'success' : 'danger'} size="sm" />
              <span className="text-xs text-text-muted">
                {station.online ? 'Telemetry live' : 'Link down'}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-text-primary lg:text-2xl">
                {station.name}
              </h1>
              <Badge tone={tone} dot size="md">
                {station.state}
              </Badge>
              {station.hasWarning && (
                <Badge tone="warning" size="md">
                  Warning
                </Badge>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-text-secondary sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem icon={MapPin} label="Region" value={station.region} />
              <InfoItem
                icon={Satellite}
                label="GPS"
                value={formatCoordinates(station.coordinates.lat, station.coordinates.lon)}
                mono
              />
              <InfoItem
                icon={Clock}
                label="Last Sync"
                value={`${formatDateTime(station.lastSync)} | ${timeAgo(station.lastSync)}`}
              />
              <InfoItem
                icon={BatteryCharging}
                label="Battery"
                value={`${station.battery}% | fw ${station.softwareVersion}`}
                mono
              />
            </div>

            <div className="mt-4 rounded-lg border border-bg-border bg-bg-surface/40 px-3 py-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-muted">
                    Telemetry Cycle
                  </p>
                  <p className="text-sm text-text-secondary">{telemetry.label}</p>
                </div>
                <span className="font-mono text-xs text-text-muted">{telemetry.note}</span>
              </div>
              <ProgressBar value={telemetry.value} tone={telemetry.tone} />
            </div>
          </div>

          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-bg-border bg-bg-surface/50 px-3 py-2">
      <Icon size={14} className="text-text-muted" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
        <div
          className={`truncate text-xs text-text-primary ${mono ? 'font-mono tabular-nums' : ''}`}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

function getTelemetryProgress(station) {
  const secondsSinceSync = Math.max(0, (Date.now() - new Date(station.lastSync).getTime()) / 1000)
  const freshness = Math.max(0, 100 - (secondsSinceSync / 300) * 100)

  if (station.state === 'Shutdown') {
    return {
      label: 'Station is offline and not transmitting telemetry.',
      note: 'No active cycle',
      tone: 'danger',
      value: 0,
    }
  }

  if (station.state === 'Transmitting') {
    return {
      label: 'Transmission window active. Buffered observations are being uplinked.',
      note: 'Uplink in progress',
      tone: 'info',
      value: Math.max(70, freshness),
    }
  }

  if (station.state === 'Collecting') {
    return {
      label: 'Sensors are sampling the current observation window.',
      note: 'Collection in progress',
      tone: 'info',
      value: Math.max(55, freshness),
    }
  }

  if (station.state === 'Configuring') {
    return {
      label: 'Configuration package is being applied before telemetry resumes.',
      note: 'Configuring firmware',
      tone: 'warning',
      value: 68,
    }
  }

  if (station.state === 'Controlled') {
    return {
      label: 'Operator has direct remote control. Routine telemetry is paused.',
      note: 'Remote control active',
      tone: 'warning',
      value: 50,
    }
  }

  if (station.state === 'Powersave') {
    return {
      label: 'Reduced cadence mode is active to preserve battery and communications.',
      note: 'Low-power cadence',
      tone: 'info',
      value: 45,
    }
  }

  return {
    label: 'Telemetry heartbeat is healthy. Five-minute collection cycle is on schedule.',
    note: `Freshness ${Math.round(freshness)}%`,
    tone: 'brand',
    value: Math.max(20, freshness),
  }
}
