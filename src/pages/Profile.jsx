import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Building2, LogOut, Mail, Phone, Save, Shield, UserRound } from 'lucide-react'
import PageWrapper, { PageBody, PageHeader } from '../components/layout/PageWrapper'
import Card, { CardBody, CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import { Input } from '../components/common/Form'
import { useToast } from '../components/common/Toast'
import { useAuth } from '../components/auth/AuthProvider'
import { formatDateTime } from '../utils/formatters'

export default function Profile() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, updateProfile, logout } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [team, setTeam] = useState(user?.team || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [location, setLocation] = useState(user?.location || '')

  const handleSave = () => {
    updateProfile({ name, team, phone, location })
    toast.success('Profile updated')
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Profile"
        description="Review operator identity, team assignment, and contact details."
        actions={
          <>
            <Badge tone="success" size="md">
              Authenticated session
            </Badge>
            <Button variant="ghost" icon={LogOut} onClick={handleLogout}>
              Sign out
            </Button>
            <Button variant="primary" icon={Save} onClick={handleSave}>
              Save Profile
            </Button>
          </>
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader icon={UserRound} title="Operator Summary" subtitle="Current signed-in account" />
            <CardBody className="space-y-4">
              <div className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-elevated/30 p-4 min-[420px]:flex-row min-[420px]:items-center">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 font-display text-2xl font-semibold text-brand-300">
                  {user?.name?.charAt(0) || 'U'}
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold text-text-primary">
                    {user?.name}
                  </h2>
                  <p className="text-sm text-text-secondary">{user?.role}</p>
                  <p className="mt-1 break-all font-mono text-xs text-text-muted">{user?.email}</p>
                </div>
              </div>

              <SummaryRow icon={Building2} label="Team" value={user?.team} />
              <SummaryRow icon={Shield} label="Clearance" value={user?.clearance} />
              <SummaryRow icon={BadgeCheck} label="Shift" value={user?.shift} />
              <SummaryRow
                icon={Mail}
                label="Last login"
                value={formatDateTime(user?.lastLoginAt)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Editable Details" subtitle="These values update the in-app profile locally." />
            <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Display name">
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Team">
                <Input value={team} onChange={(event) => setTeam(event.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
              </Field>
              <Field label="Operations hub">
                <Input value={location} onChange={(event) => setLocation(event.target.value)} />
              </Field>
              <Field label="Email">
                <Input value={user?.email || ''} disabled />
              </Field>
              <Field label="Role">
                <Input value={user?.role || ''} disabled />
              </Field>
            </CardBody>
          </Card>
        </div>
      </PageBody>
    </PageWrapper>
  )
}

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
      {children}
    </label>
  )
}

function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-bg-border bg-bg-elevated/20 px-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-surface text-text-secondary">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
        <div className="text-sm text-text-primary">{value || '--'}</div>
      </div>
    </div>
  )
}
