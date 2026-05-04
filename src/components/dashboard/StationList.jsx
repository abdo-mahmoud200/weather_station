import { useMemo, useState } from 'react'
import { ArrowUpDown, Filter } from 'lucide-react'
import { SearchInput, Select } from '../common/Form'
import Badge, { stateToneMap } from '../common/Badge'
import LiveDot from '../common/LiveDot'
import EmptyState from '../common/EmptyState'
import { formatMetric, isAnomalous, timeAgo } from '../../utils/formatters'

const SORTS = [
  { value: 'updated', label: 'Last update' },
  { value: 'tempDesc', label: 'Temperature high-low' },
  { value: 'tempAsc', label: 'Temperature low-high' },
  { value: 'status', label: 'Status' },
  { value: 'nameAsc', label: 'Name A-Z' },
]

export default function StationList({
  stations,
  regions,
  selectedId,
  onSelect,
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('updated')

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    let results = stations.filter((station) => {
      if (region !== 'all' && station.region !== region) return false
      if (status === 'online' && !station.online) return false
      if (status === 'warning' && !station.hasWarning) return false
      if (status === 'offline' && station.online) return false
      if (status === 'powersave' && station.state !== 'Powersave') return false

      if (
        normalizedQuery &&
        !(
          station.id.toLowerCase().includes(normalizedQuery) ||
          station.name.toLowerCase().includes(normalizedQuery) ||
          station.region.toLowerCase().includes(normalizedQuery)
        )
      ) {
        return false
      }

      return true
    })

    switch (sort) {
      case 'tempDesc':
        results = results.sort(
          (a, b) => b.metrics.airTemperature.current - a.metrics.airTemperature.current,
        )
        break
      case 'tempAsc':
        results = results.sort(
          (a, b) => a.metrics.airTemperature.current - b.metrics.airTemperature.current,
        )
        break
      case 'status':
        results = results.sort((a, b) => getStatusRank(a) - getStatusRank(b))
        break
      case 'nameAsc':
        results = results.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        results = results.sort((a, b) => new Date(b.lastSync) - new Date(a.lastSync))
    }

    return results
  }, [stations, query, region, status, sort])

  return (
    <div className={`card flex flex-col ${className}`}>
      <div className="border-b border-bg-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-text-primary">
              Station Registry
            </h3>
            <p className="text-xs text-text-muted">
              {filtered.length} of {stations.length} stations
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <SearchInput
            placeholder="Search by ID, name, or region..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <Select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              aria-label="Filter region"
            >
              <option value="all">All regions</option>
              {regions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>

            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter status"
            >
              <option value="all">All statuses</option>
              <option value="online">Online</option>
              <option value="warning">Warning</option>
              <option value="offline">Offline</option>
              <option value="powersave">Powersave</option>
            </Select>
          </div>

          <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
            <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
              <ArrowUpDown size={12} /> Sort
            </span>
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="flex-1"
            >
              {SORTS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="max-h-[70vh] min-h-[280px] flex-1 overflow-y-auto p-2 xl:max-h-[720px] xl:min-h-[360px]">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No stations match these filters"
            description="Try clearing the search or selecting a wider region."
          />
        ) : (
          <ul className="space-y-1">
            {filtered.map((station) => {
              const tone = stateToneMap[station.state] || 'neutral'
              const active = station.id === selectedId
              const anomalousTemp = isAnomalous(
                'airTemperature',
                station.metrics.airTemperature.current,
              )

              return (
                <li key={station.id}>
                  <button
                    onClick={() => onSelect?.(station)}
                    className={[
                      'group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-start transition-colors min-[420px]:items-center',
                      active ? 'bg-brand-500/10' : 'hover:bg-bg-elevated',
                    ].join(' ')}
                  >
                    <LiveDot
                      tone={
                        !station.online
                          ? 'danger'
                          : station.hasWarning
                            ? 'warning'
                            : station.state === 'Powersave'
                              ? 'info'
                              : 'success'
                      }
                      size="sm"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-medium text-text-primary">
                          {station.name}
                        </span>
                        <span
                          className={`metric-value text-[11px] ${
                            anomalousTemp ? 'text-accent-danger' : 'text-text-muted'
                          }`}
                        >
                          {formatMetric(
                            station.metrics.airTemperature.current,
                            station.metrics.airTemperature.unit,
                            1,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
                        <span className="font-mono">{station.id}</span>
                        <span className="truncate">{timeAgo(station.lastSync)}</span>
                      </div>
                    </div>

                    <Badge tone={tone} size="xs">
                      {station.state}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function getStatusRank(station) {
  if (station.hasWarning) return 1
  if (station.online && station.state !== 'Powersave') return 2
  if (station.state === 'Powersave') return 3
  return 4
}
