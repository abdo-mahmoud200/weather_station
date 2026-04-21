import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, LogIn, Mountain, User } from 'lucide-react'
import Button from '../components/common/Button'
import Card, { CardBody } from '../components/common/Card'
import { Input } from '../components/common/Form'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../components/auth/AuthProvider'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { login, authLoading } = useAuth()

  const [email, setEmail] = useState('operator@wws.gov')
  const [password, setPassword] = useState('Wws123!')

  const nextPath = location.state?.from || '/'

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      await login({ email, password })
      toast.success('Signed in successfully')
      navigate(nextPath, { replace: true })
    } catch (error) {
      toast.error(error.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-bg-base px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-3xl border border-bg-border bg-gradient-to-br from-brand-900/30 via-bg-surface to-bg-base p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-brand-400/20 bg-brand-500/10 px-4 py-2 text-sm text-brand-200">
                <Mountain size={18} />
                Wilderness Weather Stations
              </div>
              <h1 className="mt-6 max-w-lg font-display text-4xl font-semibold tracking-tight text-text-primary">
                Secure access for remote station monitoring operations.
              </h1>
              <p className="mt-4 max-w-xl text-base text-text-secondary">
                Sign in to review telemetry, issue remote commands, manage station registration,
                and export operational reports.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile label="Coverage" value="15 active stations" />
              <InfoTile label="Refresh" value="Live + timed polling" />
              <InfoTile label="Access" value="GovOps operator login" />
            </div>
          </section>

          <Card className="overflow-hidden rounded-3xl">
            <CardBody className="p-0">
              <div className="border-b border-bg-border bg-bg-surface/70 px-6 py-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
                    <LogIn size={22} />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-text-primary">
                      Operator Login
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Use the assigned credentials to enter the dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
                    Email
                  </label>
                  <Input
                    icon={User}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
                    Password
                  </label>
                  <Input
                    icon={Lock}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div className="rounded-2xl border border-bg-border bg-bg-elevated/30 p-4 text-sm text-text-secondary">
                  <div className="font-medium text-text-primary">Demo credentials</div>
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    <div>Email: operator@wws.gov</div>
                    <div>Password: Wws123!</div>
                  </div>
                </div>

                <Button type="submit" variant="primary" icon={LogIn} loading={authLoading} className="w-full">
                  Sign In
                </Button>

                <p className="text-center text-xs text-text-muted">
                  Returning to operations overview after login.{' '}
                  <Link to="/" className="text-brand-300 hover:text-brand-200">
                    View dashboard route
                  </Link>
                </p>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-elevated/40 p-4">
      <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-2 font-mono text-sm text-text-primary">{value}</div>
    </div>
  )
}
