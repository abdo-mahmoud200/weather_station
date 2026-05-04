import { AlertTriangle, BatteryCharging, WifiOff } from 'lucide-react'
import LiveDot from '../common/LiveDot'
import { formatMetric } from '../../utils/formatters'

const BOUNDS = {
  minLat: 20,
  maxLat: 32,
  minLng: 24,
  maxLng: 38,
}

export default function EgyptStationMap({ stations = [], selectedId, onSelect }) {
  const regions = groupByRegion(stations)

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bg-border px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-text-primary">Egypt Wilderness Network</h2>
          <p className="text-xs text-text-muted">{stations.length} remote stations across {regions.length} regions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
          <Legend tone="success" label="Online" />
          <Legend tone="warning" label="Warning" />
          <Legend tone="danger" label="Offline" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_280px]">
        <div className="relative min-h-[280px] bg-bg-base sm:min-h-[360px]">
          <svg viewBox="0 0 720 460" className="h-full min-h-[280px] w-full sm:min-h-[360px]">
            <defs>
              <linearGradient id="mapLand" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#182230" />
                <stop offset="100%" stopColor="#101821" />
              </linearGradient>
            </defs>
            <rect width="720" height="460" fill="#0d1117" />
            <path
              d="M126 52 565 58 585 378 480 417 331 392 164 421 118 334 141 229 112 143Z"
              fill="url(#mapLand)"
              stroke="#263445"
              strokeWidth="2"
            />
            <path d="M420 72 448 166 440 288 464 402" stroke="#3c4a5b" strokeWidth="5" opacity=".7" />
            <path d="M520 54 552 155 585 378" stroke="#58a6ff" strokeWidth="9" opacity=".18" />
            <path d="M150 168 298 182 436 170" stroke="#263445" strokeWidth="1" opacity=".8" />
            <path d="M142 280 300 290 454 283" stroke="#263445" strokeWidth="1" opacity=".8" />

            {stations.map((station) => {
              const point = project(station.coordinates.lat, station.coordinates.lon)
              const tone = stationTone(station)
              const active = station.id === selectedId

              return (
                <g key={station.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 15 : 10}
                    fill={toneFill(tone)}
                    opacity={active ? '.22' : '.12'}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 7 : 5}
                    fill={toneFill(tone)}
                    stroke={active ? '#e6edf3' : '#0d1117'}
                    strokeWidth="2"
                    className="cursor-pointer transition-all hover:stroke-brand-200"
                    onClick={() => onSelect?.(station)}
                  />
                  <text
                    x={point.x + 10}
                    y={point.y - 8}
                    fill="#9aa7b4"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {station.id}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="border-t border-bg-border bg-bg-surface/70 p-3 lg:border-l lg:border-t-0">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">Regional Coverage</div>
          <div className="space-y-2">
            {regions.map((entry) => (
              <div key={entry.region} className="rounded-md border border-bg-border bg-bg-elevated/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-text-primary">{entry.region}</span>
                  <span className="font-mono text-[11px] text-text-muted">{entry.stations.length}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
                  <span>{formatMetric(entry.avgTemp, 'deg C', 1)}</span>
                  <span className="inline-flex items-center gap-1">
                    <BatteryCharging size={11} /> {entry.avgBattery != null ? `${Math.round(entry.avgBattery)}%` : '--'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Legend({ tone, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <LiveDot tone={tone} size="sm" />
      {label}
    </span>
  )
}

function project(lat, lng) {
  const x = 92 + ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 536
  const y = 420 - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 360
  return { x, y }
}

function stationTone(station) {
  if (!station.online) return 'danger'
  if (station.hasWarning) return 'warning'
  return 'success'
}

function toneFill(tone) {
  if (tone === 'danger') return '#f85149'
  if (tone === 'warning') return '#d29922'
  return '#3fb950'
}

function groupByRegion(stations) {
  const groups = new Map()

  for (const station of stations) {
    const items = groups.get(station.region) || []
    items.push(station)
    groups.set(station.region, items)
  }

  return Array.from(groups.entries())
    .map(([region, items]) => ({
      region,
      stations: items,
      avgTemp: average(items.map((station) => station.metrics.airTemperature.current)),
      avgBattery: average(items.map((station) => station.battery)),
    }))
    .sort((a, b) => a.region.localeCompare(b.region))
}

function average(values) {
  const valid = values.map(Number).filter((value) => Number.isFinite(value))
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}
