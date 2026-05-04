import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, User } from 'lucide-react'
import LiveDot from '../common/LiveDot'
import { formatDateTime } from '../../utils/formatters'
import { useAuth } from '../auth/AuthProvider'
import { useSocketConnection } from '../../hooks/useSocket'

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const socketConnection = useSocketConnection()
  const [now, setNow] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-bg-border bg-bg-base/80 backdrop-blur">
      <div className="flex h-14 min-w-0 items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="shrink-0 rounded-md border border-bg-border bg-bg-elevated p-1.5 text-text-secondary focus-ring lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu size={16} />
          </button>

          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo.svg"
              alt="Wilderness Weather Stations"
              className="h-8 w-8 shrink-0 rounded-full shadow-glow sm:h-9 sm:w-9"
            />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-display text-sm font-semibold tracking-tight text-text-primary">
                Wilderness Weather Stations
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
                Ministry of Environment | WWS
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-bg-border bg-bg-elevated px-3 py-1 md:flex">
            <LiveDot tone={socketConnection.connected ? 'success' : 'warning'} size="sm" />
            <span className="text-xs font-medium text-text-secondary">
              {socketConnection.connected ? 'Live' : 'Polling'}
            </span>
            <span className="mx-1 h-3 w-px bg-bg-border" />
            <span className="metric-value text-xs text-text-primary">{formatDateTime(now)}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-bg-border bg-bg-elevated px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary focus-ring"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-surface text-text-primary">
                {user?.name?.charAt(0) || <User size={14} />}
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="font-medium text-text-primary">{user?.name || 'Operator'}</span>
                <span className="font-mono text-[10px] text-text-muted">{user?.shift || user?.role}</span>
              </span>
              <ChevronDown className="shrink-0" size={14} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-bg-border bg-bg-surface shadow-xl animate-fade-in"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <div className="border-b border-bg-border px-3 py-2">
                  <p className="text-xs font-semibold text-text-primary">{user?.name || 'Operator'}</p>
                  <p className="font-mono text-[10px] text-text-muted">{user?.email || '--'}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/profile')
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                >
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                    navigate('/login', { replace: true })
                  }}
                  className="flex w-full items-center gap-2 border-t border-bg-border px-3 py-2 text-xs text-accent-danger hover:bg-accent-dangerSoft"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
