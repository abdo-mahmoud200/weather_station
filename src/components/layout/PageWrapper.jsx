import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAlerts } from '../../services/api'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import useRefreshInterval from '../../hooks/useRefreshInterval'
import { useRealtimeRefresh } from '../../hooks/useSocket'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function PageWrapper({ children, alertsCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [liveAlertsCount, setLiveAlertsCount] = useState(alertsCount)
  const refreshIntervalMs = useRefreshInterval()

  const refreshAlertsCount = useCallback(async () => {
    try {
      const alerts = await fetchAlerts()
      setLiveAlertsCount(alerts.filter((alert) => alert.status === 'new').length)
    } catch {
      setLiveAlertsCount(alertsCount)
    }
  }, [alertsCount])

  useEffect(() => {
    refreshAlertsCount()
  }, [refreshAlertsCount])

  useAutoRefresh(refreshAlertsCount, refreshIntervalMs)
  useRealtimeRefresh(
    refreshAlertsCount,
    ['alert:new', 'status:changed', 'station:removed', 'station:updated', 'stations:updated'],
    [refreshAlertsCount],
  )

  return (
    <div className="relative min-h-screen">
      <div className="flex">
        <Sidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          alertsCount={liveAlertsCount}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar onToggleSidebar={() => setMobileOpen((value) => !value)} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, actions, breadcrumbs }) {
  return (
    <div className="border-b border-bg-border bg-bg-base/40">
      <div className="flex flex-col gap-3 px-4 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
        <div className="min-w-0">
          {breadcrumbs && (
            <div className="mb-1 flex items-center gap-1 text-xs text-text-muted">
              {breadcrumbs.map((breadcrumb, index) => (
                <span key={`${breadcrumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 && <span className="text-text-dim">/</span>}
                  {breadcrumb.to ? (
                    <Link to={breadcrumb.to} className="hover:text-text-primary">
                      {breadcrumb.label}
                    </Link>
                  ) : (
                    <span>{breadcrumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="font-display text-xl font-semibold tracking-tight text-text-primary lg:text-2xl">
            {title}
          </h1>
          {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function PageBody({ className = '', children }) {
  return <div className={`px-4 py-5 lg:px-6 lg:py-6 ${className}`}>{children}</div>
}
