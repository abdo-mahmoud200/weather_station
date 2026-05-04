import { startTransition, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter as FilterIcon, RefreshCw } from 'lucide-react'
import PageWrapper, { PageBody, PageHeader } from '../components/layout/PageWrapper'
import StatsBar from '../components/dashboard/StatsBar'
import OperationsPanel from '../components/dashboard/OperationsPanel'
import StationCard from '../components/dashboard/StationCard'
import StationList from '../components/dashboard/StationList'
import Button from '../components/common/Button'
import { Select } from '../components/common/Form'
import EmptyState from '../components/common/EmptyState'
import { useStations } from '../hooks/useStations'
import useAutoRefresh from '../hooks/useAutoRefresh'
import useNowTicker from '../hooks/useNowTicker'
import useRefreshInterval from '../hooks/useRefreshInterval'
import { REGIONS } from '../services/mockData'
import { timeAgo } from '../utils/formatters'
import { getUserPreferences } from '../utils/preferences'
import { useRealtimeRefresh } from '../hooks/useSocket'
import { fetchStatsSummary } from '../services/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const { stations, loading, refresh, lastUpdated } = useStations()
  const [summary, setSummary] = useState(null)
  const refreshIntervalMs = useRefreshInterval()

  const refreshSummary = async () => {
    try {
      const data = await fetchStatsSummary()
      setSummary(data)
    } catch {
      setSummary(null)
    }
  }

  useAutoRefresh(refresh, refreshIntervalMs)
  useAutoRefresh(refreshSummary, refreshIntervalMs)
  useRealtimeRefresh(
    () => {
      refresh()
      refreshSummary()
    },
    ['status:changed', 'station:added', 'station:removed', 'station:updated', 'stations:updated'],
    [refresh],
  )
  useNowTicker(1000)

  useEffect(() => {
    refreshSummary()
  }, [])

  const [gridFilter, setGridFilter] = useState(() => getUserPreferences().defaultDashboardView)
  const [selectedId, setSelectedId] = useState(null)

  const stats = useMemo(() => {
    const onlineStations = stations.filter((station) => station.online)
    const online = onlineStations.length
    const warnings = stations.filter((station) => station.hasWarning && station.online).length
    const offline = stations.filter((station) => !station.online || station.state === 'Shutdown').length
    const powersave = stations.filter((station) => station.state === 'Powersave').length
    const avgAirTemperature =
      online > 0
        ? onlineStations.reduce((sum, station) => sum + station.metrics.airTemperature.current, 0) / online
        : null

    return { online, warnings, offline, powersave, avgAirTemperature }
  }, [stations])

  const gridStations = useMemo(() => {
    if (gridFilter === 'all') return stations
    if (gridFilter === 'online') return stations.filter((station) => station.online)
    if (gridFilter === 'warnings') return stations.filter((station) => station.hasWarning && station.online)
    if (gridFilter === 'offline') {
      return stations.filter((station) => !station.online || station.state === 'Shutdown')
    }
    if (gridFilter === 'powersave') return stations.filter((station) => station.state === 'Powersave')

    return stations
  }, [stations, gridFilter])

  const openStation = (station) => {
    setSelectedId(station.id)
    startTransition(() => {
      navigate(`/stations/${station.id}`)
    })
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Operations Dashboard"
        description="Real-time telemetry from remote wilderness weather stations."
        actions={
          <>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-bg-border bg-bg-surface px-3 py-1 text-xs text-text-muted">
              <span className="metric-value">
                {lastUpdated ? `updated ${timeAgo(lastUpdated)}` : 'loading...'}
              </span>
            </span>
            <Button icon={RefreshCw} onClick={refresh} loading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <StatsBar stats={stats} loading={loading} />

            <OperationsPanel summary={summary} stations={stations} />

            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bg-border px-4 py-3">
                <div>
                  <h2 className="font-display text-sm font-semibold text-text-primary">
                    Stations Grid
                  </h2>
                  <p className="text-xs text-text-muted">
                    Click a station card to open its detail view.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                    <FilterIcon size={12} /> View
                  </span>
                  <Select
                    value={gridFilter}
                    onChange={(event) => setGridFilter(event.target.value)}
                    className="w-full sm:w-auto"
                  >
                    <option value="all">All ({stations.length})</option>
                    <option value="online">Online ({stats.online})</option>
                    <option value="warnings">Warnings ({stats.warnings})</option>
                    <option value="offline">Offline ({stats.offline})</option>
                    <option value="powersave">Powersave ({stats.powersave})</option>
                  </Select>
                </div>
              </div>

              <div className="p-4">
                {loading && stations.length === 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="skeleton h-36 rounded-xl" />
                    ))}
                  </div>
                ) : gridStations.length === 0 ? (
                  <EmptyState
                    icon={FilterIcon}
                    title="No stations in this view"
                    description="Adjust the filter above to see stations in other states."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {gridStations.map((station) => (
                      <StationCard
                        key={station.id}
                        station={station}
                        onClick={() => openStation(station)}
                        onControl={() => navigate(`/stations/${station.id}/control`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="xl:sticky xl:top-16 xl:self-start">
            <StationList
              stations={stations}
              regions={REGIONS}
              selectedId={selectedId}
              onSelect={openStation}
            />
          </div>
        </div>
      </PageBody>
    </PageWrapper>
  )
}
