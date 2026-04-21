import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  Radio,
  FileText,
  Bell,
  ServerCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/stations/manage', label: 'Station Registry', icon: ServerCog },
  { to: '/alerts', label: 'Alerts & Log', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileText },
]

export default function Sidebar({ collapsed, onCollapse, open, onClose, alertsCount = 0 }) {
  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed lg:sticky top-0 z-40 flex h-screen flex-col border-r border-bg-border bg-bg-surface transition-all',
          collapsed ? 'lg:w-[72px]' : 'lg:w-60',
          'w-64',
          open ? 'left-0' : '-left-80 lg:left-0',
        ].join(' ')}
      >
        <div className="flex h-14 items-center justify-between border-b border-bg-border px-3">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/15 text-brand-400">
              <Radio size={16} />
            </span>
            {!collapsed && (
              <span className="font-display text-xs font-semibold tracking-wider uppercase text-text-secondary">
                Control
              </span>
            )}
          </div>
          <button
            onClick={() => onCollapse(!collapsed)}
            className="hidden lg:inline-flex rounded-md p-1 text-text-muted hover:bg-bg-elevated hover:text-text-primary focus-ring"
            aria-label="Collapse sidebar"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-500/10 text-brand-300'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-400" />
                    )}
                    <Icon size={16} strokeWidth={2} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.to === '/alerts' && alertsCount > 0 && (
                      <span className="rounded-full bg-accent-danger/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-danger">
                        {alertsCount > 99 ? '99+' : alertsCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className={`border-t border-bg-border p-2 ${collapsed ? 'text-center' : ''}`}>
          <div className="flex items-center gap-2 rounded-md bg-bg-elevated/60 px-2.5 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-surface text-text-secondary">
              <Activity size={14} />
            </span>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-semibold text-text-primary">System OK</p>
                <p className="font-mono text-[10px] text-text-muted">v2.3.1</p>
              </div>
            )}
          </div>
          <NavLink
            to="/preferences"
            onClick={onClose}
            className={({ isActive }) =>
              [
                'mt-2 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors focus-ring',
                isActive
                  ? 'bg-brand-500/10 text-brand-300'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary',
                collapsed ? 'justify-center' : '',
              ].join(' ')
            }
          >
            <Settings size={14} />
            {!collapsed && <span>Preferences</span>}
          </NavLink>
        </div>
      </aside>
    </>
  )
}
