import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  CloudRain,
  Compass,
  Gauge,
  Leaf,
  RefreshCw,
  SlidersHorizontal,
  Thermometer,
  Wind,
} from 'lucide-react'
import PageWrapper, { PageBody } from '../layout/PageWrapper'
import StationHeader from './StationHeader'
import MetricCard from '../dashboard/MetricCard'
import { MultiSeriesChart, RainfallBarChart, TimeSeriesChart } from './Charts'
import WindCompass from './WindCompass'
import InstrumentsPanel from './InstrumentsPanel'
import Button from '../common/Button'
import EmptyState from '../common/EmptyState'
import { Skeleton } from '../common/Skeleton'
import { useStation } from '../../hooks/useStations'
import { useRainfall7d, useStationSeries } from '../../hooks/useWeatherData'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import useNowTicker from '../../hooks/useNowTicker'
import useRefreshInterval from '../../hooks/useRefreshInterval'
import { formatMetric, timeAgo } from '../../utils/formatters'
import { useRealtimeRefresh, useStationSocket } from '../../hooks/useSocket'

export default function DetailView({ stationId }) {
  const navigate = useNavigate()
  const { station, loading, refresh, lastUpdated } = useStation(stationId)
  const refreshIntervalMs = useRefreshInterval()
  useAutoRefresh(refresh, refreshIntervalMs, [stationId])
  useStationSocket(stationId)
  useNowTicker(1000)

  const [refreshKey, setRefreshKey] = useState(0)

  const refreshAll = () => {
    setRefreshKey((value) => value + 1)
    refresh()
  }

  useRealtimeRefresh(
    refreshAll,
    ['reading:new', 'status:changed', 'alert:new', 'station:updated', 'stations:updated', 'khamaseen:started', 'khamaseen:ended'],
    [stationId],
    {
      filter: (_event, payload) => {
        // Network-wide events (no stationId) always refresh; per-station
        // events only refresh when they target the watched station.
        const targetId = payload?.stationId ?? payload?.station?.id ?? payload?.alert?.stationId
        return !targetId || targetId === stationId
      },
    },
  )

  const airSeries = useStationSeries(stationId, 'airTemperature', 24, refreshKey)
  const groundSeries = useStationSeries(stationId, 'groundTemperature', 24, refreshKey)
  const pressureSeries = useStationSeries(stationId, 'pressure', 24, refreshKey)
  const windSeries = useStationSeries(stationId, 'windSpeed', 24, refreshKey)
  const rainfall = useRainfall7d(stationId, refreshKey)

  const temperatureSeries = useMemo(() => {
    const groundByT = new Map(groundSeries.data.map((point) => [point.t, point.value]))
    return airSeries.data.map((point) => ({
      t: point.t,
      airTemperature: point.value,
      groundTemperature: groundByT.get(point.t) ?? null,
    }))
  }, [airSeries.data, groundSeries.data])

  const total7d = useMemo(() => {
    if (!rainfall.data || rainfall.data.length === 0) return null
    return Number(
      rainfall.data.reduce((sum, point) => sum + Number(point.value || 0), 0).toFixed(2),
    )
  }, [rainfall.data])

  if (!loading && !station) {
    return (
      <PageWrapper>
        <PageBody>
          <EmptyState
            icon={Compass}
            title="Station not found"
            description={`No station with id "${stationId}" is registered.`}
            action={<Button onClick={() => navigate('/')}>Back to dashboard</Button>}
          />
        </PageBody>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <StationHeader
        station={station}
        actions={
          <>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-bg-border bg-bg-surface px-3 py-1 text-xs text-text-muted">
              <span className="metric-value">
                {lastUpdated ? `updated ${timeAgo(lastUpdated)}` : 'loading...'}
              </span>
            </span>
            <Button icon={RefreshCw} onClick={refreshAll} loading={loading}>
              Refresh
            </Button>
            <Button
              icon={SlidersHorizontal}
              variant="primary"
              onClick={() => navigate(`/stations/${stationId}/control`)}
              disabled={!station}
            >
              Control Panel
            </Button>
          </>
        }
      />

      <PageBody>
        {loading || !station ? (
          <SkeletonDetail />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
              <MetricCard
                className="xl:col-span-2"
                label="Air Temperature"
                icon={Thermometer}
                metricKey="airTemperature"
                value={station.metrics.airTemperature.current}
                unit={station.metrics.airTemperature.unit}
                min={station.metrics.airTemperature.min}
                max={station.metrics.airTemperature.max}
                avg={station.metrics.airTemperature.avg}
                trend={station.metrics.airTemperature.trend}
                updatedAt={station.lastSync}
              />
              <MetricCard
                className="xl:col-span-2"
                label="Ground Temperature"
                icon={Leaf}
                metricKey="groundTemperature"
                value={station.metrics.groundTemperature.current}
                unit={station.metrics.groundTemperature.unit}
                min={station.metrics.groundTemperature.min}
                max={station.metrics.groundTemperature.max}
                avg={station.metrics.groundTemperature.avg}
                trend={station.metrics.groundTemperature.trend}
                updatedAt={station.lastSync}
              />
              <MetricCard
                className="xl:col-span-2"
                label="Air Pressure"
                icon={Gauge}
                metricKey="pressure"
                value={station.metrics.pressure.current}
                unit={station.metrics.pressure.unit}
                min={station.metrics.pressure.min}
                max={station.metrics.pressure.max}
                avg={station.metrics.pressure.avg}
                trend={station.metrics.pressure.trend}
                updatedAt={station.lastSync}
              />
              <MetricCard
                className="xl:col-span-2"
                label="Wind Speed"
                icon={Wind}
                metricKey="windSpeed"
                value={station.metrics.windSpeed.current}
                unit={station.metrics.windSpeed.unit}
                min={station.metrics.windSpeed.min}
                max={station.metrics.windSpeed.max}
                avg={station.metrics.windSpeed.avg}
                trend={station.metrics.windSpeed.trend}
                updatedAt={station.lastSync}
              />
              <MetricCard
                className="xl:col-span-2"
                label="Total Rainfall"
                icon={CloudRain}
                metricKey="rainfall"
                value={station.metrics.rainfall.total24h}
                unit={station.metrics.rainfall.unit}
                digits={2}
                footer={`7d accumulation ${formatMetric(total7d, 'mm', 2)}`}
                updatedAt={station.lastSync}
              />

              <div className="card flex flex-col justify-between p-4 xl:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass size={14} className="text-text-muted" />
                    <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      Wind Direction
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-text-muted">
                    updated {timeAgo(station.lastSync)}
                  </span>
                </div>
                <WindCompass
                  degrees={station.metrics.windDirection.current}
                  speed={station.metrics.windSpeed.current}
                  unit={station.metrics.windSpeed.unit}
                  size={150}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <ChartCard
                title="Temperature"
                subtitle="Air and ground temperature | last 24 hours"
                loading={airSeries.loading || groundSeries.loading}
                content={
                  <MultiSeriesChart
                    data={temperatureSeries}
                    unit={station.metrics.airTemperature.unit}
                    series={[
                      { key: 'airTemperature', label: 'Air', color: '#3fb950' },
                      { key: 'groundTemperature', label: 'Ground', color: '#f0883e' },
                    ]}
                  />
                }
              />
              <ChartCard
                title="Wind Speed"
                subtitle="Wind speed | last 24 hours"
                icon={station.metrics.windSpeed.trend === 'up' ? ArrowUpRight : ArrowDownRight}
                loading={windSeries.loading}
                content={<TimeSeriesChart data={windSeries.data} unit="m/s" color="#58a6ff" type="area" />}
              />
              <ChartCard
                title="Pressure"
                subtitle="Barometric pressure | last 24 hours"
                icon={station.metrics.pressure.trend === 'up' ? ArrowUpRight : ArrowDownRight}
                loading={pressureSeries.loading}
                content={<TimeSeriesChart data={pressureSeries.data} unit="hPa" color="#bc8cff" type="area" />}
              />
              <ChartCard
                title="Rainfall"
                subtitle="Daily accumulation | last 7 days"
                loading={rainfall.loading}
                content={<RainfallBarChart data={rainfall.data} />}
              />
            </div>

            <InstrumentsPanel instruments={station.instruments} lastSync={station.lastSync} />
          </div>
        )}
      </PageBody>
    </PageWrapper>
  )
}

function ChartCard({ title, subtitle, icon: TrendIcon, loading, content }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="font-display text-sm font-semibold text-text-primary">{title}</h4>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
        {TrendIcon && <TrendIcon size={16} className="text-text-muted" />}
      </div>
      {loading ? <Skeleton className="h-[220px] w-full rounded-md" /> : content}
    </div>
  )
}

function SkeletonDetail() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-56 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
