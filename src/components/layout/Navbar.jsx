import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Mountain, User } from 'lucide-react'
import LiveDot from '../common/LiveDot'
import { formatDateTime } from '../../utils/formatters'
import { useAuth } from '../auth/AuthProvider'

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [now, setNow] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-bg-border bg-bg-base/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-md border border-bg-border bg-bg-elevated p-1.5 text-text-secondary focus-ring lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
              <Mountain size={18} strokeWidth={2.25} />
            </span>
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

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-bg-border bg-bg-elevated px-3 py-1 md:flex">
            <LiveDot tone="success" size="sm" />
            <span className="text-xs font-medium text-text-secondary">Live</span>
            <span className="mx-1 h-3 w-px bg-bg-border" />
            <span className="metric-value text-xs text-text-primary">{formatDateTime(now)}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="flex items-center gap-2 rounded-lg border border-bg-border bg-bg-elevated px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary focus-ring"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-surface text-text-primary">
                {user?.name?.charAt(0) || <User size={14} />}
              </span>
              <span className="hidden flex-col items-start leading-tight sm:flex">
                <span className="font-medium text-text-primary">{user?.name || 'Operator'}</span>
                <span className="font-mono text-[10px] text-text-muted">{user?.shift || user?.role}</span>
              </span>
              <ChevronDown size={14} />
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
