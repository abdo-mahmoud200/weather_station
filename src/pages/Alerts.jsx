import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Activity,
  AlertTriangle,
  WifiOff,
  BatteryLow,
  Sparkles,
  CheckCircle2,
  CircleDot,
  Filter as FilterIcon,
} from 'lucide-react'
import PageWrapper, { PageHeader, PageBody } from '../components/layout/PageWrapper'
import Card, { CardHeader } from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import { Select, SearchInput } from '../components/common/Form'
import EmptyState from '../components/common/EmptyState'
import { Skeleton } from '../components/common/Skeleton'
import { useToast } from '../components/common/Toast'
import { fetchAlerts, fetchActivity, updateAlertStatus } from '../services/api'
import { useStations } from '../hooks/useStations'
import useAutoRefresh from '../hooks/useAutoRefresh'
import useNowTicker from '../hooks/useNowTicker'
import useRefreshInterval from '../hooks/useRefreshInterval'
import { formatDateTime, timeAgo } from '../utils/formatters'
import { ALERT_TYPES, SEVERITIES, STATUSES, EVENT_TYPES } from '../services/mockData'
import { useRealtimeRefresh } from '../hooks/useSocket'

const ALERT_ICONS = {
  temperature_high: AlertTriangle,
  temperature_critical: AlertTriangle,
  temperature_freezing: AlertTriangle,
  battery_low: BatteryLow,
  battery_critical: BatteryLow,
  signal_weak: WifiOff,
  signal_lost: WifiOff,
  wind_strong: Sparkles,
  wind_storm: Sparkles,
  station_shutdown: WifiOff,
  station_connection_lost: WifiOff,
}

const SEVERITY_TONE = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
}

const STATUS_TONE = {
  new: 'danger',
  acknowledged: 'warning',
}

export default function Alerts() {
  const toast = useToast()
  const { stations } = useStations()
  const refreshIntervalMs = useRefreshInterval()

  const [tab, setTab] = useState('alerts')

  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(true)

  const loadAlerts = () =>
    fetchAlerts()
      .then((d) => {
        setAlerts(d)
        setAlertsLoading(false)
      })
      .catch(() => setAlertsLoading(false))
  const loadActivity = () =>
    fetchActivity()
      .then((d) => {
        setActivity(d)
        setActivityLoading(false)
      })
      .catch(() => setActivityLoading(false))

  useEffect(() => {
    loadAlerts()
    loadActivity()
  }, [])
  useAutoRefresh(() => {
    loadAlerts()
    loadActivity()
  }, refreshIntervalMs)
  useRealtimeRefresh(
    () => {
      loadAlerts()
      loadActivity()
    },
    ['alert:new', 'status:changed', 'station:added', 'station:removed', 'station:updated', 'stations:updated'],
    [],
  )
  useNowTicker(1000)

  // Alert filters
  const [alertStation, setAlertStation] = useState('all')
  const [alertSeverity, setAlertSeverity] = useState('all')
  const [alertStatus, setAlertStatus] = useState('all')
  const [alertType, setAlertType] = useState('all')

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertStation !== 'all' && a.stationId !== alertStation) return false
      if (alertSeverity !== 'all' && a.severity !== alertSeverity) return false
      if (alertStatus !== 'all' && a.status !== alertStatus) return false
      if (alertType !== 'all' && a.type !== alertType) return false
      return true
    })
  }, [alerts, alertStation, alertSeverity, alertStatus, alertType])

  // Activity filters
  const [actQuery, setActQuery] = useState('')
  const [actStation, setActStation] = useState('all')
  const [actType, setActType] = useState('all')
  const [actDate, setActDate] = useState('')

  const filteredActivity = useMemo(() => {
    const q = actQuery.trim().toLowerCase()
    return activity.filter((e) => {
      if (actStation !== 'all' && e.stationId !== actStation) return false
      if (actType !== 'all' && e.type !== actType) return false
      if (actDate) {
        const d = new Date(e.timestamp)
        const target = new Date(actDate)
        if (
          d.getFullYear() !== target.getFullYear() ||
          d.getMonth() !== target.getMonth() ||
          d.getDate() !== target.getDate()
        )
          return false
      }
      if (q && !`${e.stationId} ${e.stationName} ${e.type} ${e.message}`.toLowerCase().includes(q))
        return false
      return true
    })
  }, [activity, actQuery, actStation, actType, actDate])

  const changeAlertStatus = async (alert, next) => {
    const prev = alert.status
    setAlerts((list) => list.map((x) => (x.id === alert.id ? { ...x, status: next } : x)))
    try {
      await updateAlertStatus(alert.id, next)
      toast.success(`Alert marked ${next}`, { title: alert.id })
    } catch {
      setAlerts((list) => list.map((x) => (x.id === alert.id ? { ...x, status: prev } : x)))
      toast.error('Failed to update alert')
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Alerts & Activity Log"
        description="Review station alerts and the full command / event history."
        actions={
          <div className="inline-flex rounded-md border border-bg-border bg-bg-elevated p-0.5">
            <TabButton active={tab === 'alerts'} onClick={() => setTab('alerts')} icon={Bell}>
              Alerts
              {alerts.filter((a) => a.status === 'new').length > 0 && (
                <span className="ml-2 rounded-full bg-accent-danger/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-danger">
                  {alerts.filter((a) => a.status === 'new').length}
                </span>
              )}
            </TabButton>
            <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={Activity}>
              Activity
            </TabButton>
          </div>
        }
      />

      <PageBody>
        {tab === 'alerts' ? (
          <Card>
            <CardHeader
              title="Alert Feed"
              subtitle={`${filteredAlerts.length} alerts | ${
                alerts.filter((a) => a.status === 'new').length
              } new`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                    <FilterIcon size={12} />
                  </span>
                  <Select value={alertStation} onChange={(e) => setAlertStation(e.target.value)}>
                    <option value="all">All stations</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}
                      </option>
                    ))}
                  </Select>
                  <Select value={alertType} onChange={(e) => setAlertType(e.target.value)}>
                    <option value="all">All types</option>
                    {ALERT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <Select value={alertSeverity} onChange={(e) => setAlertSeverity(e.target.value)}>
                    <option value="all">Any severity</option>
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                  <Select value={alertStatus} onChange={(e) => setAlertStatus(e.target.value)}>
                    <option value="all">Any status</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
              }
            />
            {alertsLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={CheckCircle2}
                  title="No alerts match these filters"
                  description="Try relaxing the severity or status filter."
                />
              </div>
            ) : (
              <ul className="divide-y divide-bg-border">
                {filteredAlerts.map((a) => {
                  const Icon = ALERT_ICONS[a.type] || AlertTriangle
                  return (
                    <li key={a.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                            a.severity === 'critical'
                              ? 'border-accent-danger/30 bg-accent-dangerSoft text-accent-danger'
                              : a.severity === 'warning'
                                ? 'border-accent-warning/30 bg-accent-warningSoft text-accent-warning'
                                : 'border-accent-info/30 bg-accent-infoSoft text-accent-info'
                          }`}
                        >
                          <Icon size={16} strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-text-muted">{a.stationId}</span>
                            <span className="text-sm font-medium text-text-primary">
                              {a.stationName}
                            </span>
                            <Badge tone={SEVERITY_TONE[a.severity]} size="xs">
                              {a.severity}
                            </Badge>
                            <Badge tone={STATUS_TONE[a.status]} size="xs" dot>
                              {a.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-text-secondary">{a.message}</p>
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            <span className="font-mono">{formatDateTime(a.timestamp)}</span>{' '}
                            | {timeAgo(a.timestamp)} | {a.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {a.status === 'new' && (
                          <Button
                            size="sm"
                            variant="warning"
                            title="Marks the alert as reviewed. It does not fix station telemetry."
                            onClick={() => changeAlertStatus(a, 'acknowledged')}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {a.status === 'acknowledged' && (
                          <Badge tone="warning" size="sm">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader
              title="Activity Log"
              subtitle={`${filteredActivity.length} events`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <SearchInput
                    placeholder="Search..."
                    value={actQuery}
                    onChange={(e) => setActQuery(e.target.value)}
                    wrapperClassName="w-40"
                  />
                  <Select value={actStation} onChange={(e) => setActStation(e.target.value)}>
                    <option value="all">All stations</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}
                      </option>
                    ))}
                  </Select>
                  <Select value={actType} onChange={(e) => setActType(e.target.value)}>
                    <option value="all">All events</option>
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <input
                    type="date"
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                    className="h-9 rounded-md border border-bg-border bg-bg-base px-2 text-xs text-text-primary outline-none focus:border-brand-400/60"
                  />
                </div>
              }
            />
            {activityLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Activity}
                  title="No events match these filters"
                  description="Try widening your search or choosing a different date."
                />
              </div>
            ) : (
              <ul className="divide-y divide-bg-border font-mono text-xs">
                {filteredActivity.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="mt-1 text-text-muted">
                      <CircleDot size={10} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-text-muted">
                          [{formatDateTime(e.timestamp)}]
                        </span>
                        <span className="text-brand-300">{e.type}</span>
                        <span className="text-text-muted">{e.stationId}</span>
                        <span className="text-text-muted">by {e.actor}</span>
                      </div>
                      <p className="mt-0.5 font-sans text-text-secondary">{e.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </PageBody>
    </PageWrapper>
  )
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-bg-surface text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      <Icon size={13} />
      {children}
    </button>
  )
}
