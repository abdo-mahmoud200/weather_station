import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, MapPin, PlusCircle, RadioTower, Search, Trash2 } from 'lucide-react'
import PageWrapper, { PageBody, PageHeader } from '../components/layout/PageWrapper'
import Card, { CardBody, CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import ConfirmDialog from '../components/common/ConfirmDialog'
import EmptyState from '../components/common/EmptyState'
import { Input, Select, Textarea } from '../components/common/Form'
import { Skeleton } from '../components/common/Skeleton'
import { useToast } from '../components/common/Toast'
import { createStation, decommissionStation, fetchStationRegistry } from '../services/api'
import { REGIONS } from '../services/mockData'
import { formatCoordinates, formatDateTime, timeAgo } from '../utils/formatters'
import { useRealtimeRefresh } from '../hooks/useSocket'

const INITIAL_FORM = {
  name: '',
  name_ar: '',
  region: REGIONS[0],
  lat: '',
  lon: '',
  elevation: '',
  notes: '',
}

export default function StationManagement() {
  const toast = useToast()
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)
  const [confirm, setConfirm] = useState({ open: false, station: null })

  const loadRegistry = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchStationRegistry()
      setStations(response)
    } catch (error) {
      toast.error(error.message || 'Failed to load station registry')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadRegistry()
  }, [loadRegistry])

  useRealtimeRefresh(
    loadRegistry,
    ['station:added', 'station:removed', 'station:updated', 'status:changed', 'stations:updated'],
    [loadRegistry],
  )

  const activeStations = useMemo(
    () => stations.filter((station) => !station.archivedAt),
    [stations],
  )
  const archivedStations = useMemo(
    () => stations.filter((station) => station.archivedAt),
    [stations],
  )

  const filteredActive = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return activeStations

    return activeStations.filter((station) =>
      `${station.id} ${station.name} ${station.region}`.toLowerCase().includes(normalized),
    )
  }, [activeStations, query])

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.warning('Station name is required.')
      return
    }
    if (Number.isNaN(Number(form.lat)) || Number.isNaN(Number(form.lon))) {
      toast.warning('Latitude and longitude must be valid numbers.')
      return
    }

    setSaving(true)
    try {
      await createStation({
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || form.name.trim(),
        region: form.region,
        lat: Number(form.lat),
        lon: Number(form.lon),
        elevation: Number(form.elevation),
        notes: form.notes.trim(),
      })
      toast.success('Station registered')
      setForm(INITIAL_FORM)
      await loadRegistry()
    } catch (error) {
      toast.error(error.message || 'Failed to register station')
    } finally {
      setSaving(false)
    }
  }

  const handleDecommission = async () => {
    const station = confirm.station
    if (!station) return

    setSaving(true)
    try {
      await decommissionStation(station.id)
      toast.success(`Station ${station.id} decommissioned`)
      setConfirm({ open: false, station: null })
      await loadRegistry()
    } catch (error) {
      toast.error(error.message || 'Failed to remove station')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Station Registry"
        description="Register new remote stations in the monitoring platform or decommission them from active operations."
        actions={
          <>
            <Badge tone="info" size="md">
              {activeStations.length} active
            </Badge>
            <Badge tone="warning" size="md">
              {archivedStations.length} archived
            </Badge>
          </>
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader
              icon={PlusCircle}
              title="Register Station"
              subtitle="Adds a remote station to the platform registry so it can appear in monitoring views."
            />
            <CardBody>
              <form onSubmit={handleCreate} className="space-y-4">
                <Field label="Location name">
                  <Input
                    placeholder="Qattara Depression"
                    value={form.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                  />
                </Field>
                <Field label="Arabic name">
                  <Input
                    placeholder="منخفض القطارة"
                    value={form.name_ar}
                    onChange={(event) => handleChange('name_ar', event.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Region">
                    <Select
                      value={form.region}
                      onChange={(event) => handleChange('region', event.target.value)}
                    >
                      {REGIONS.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Latitude">
                    <Input
                      type="number"
                      step="0.0001"
                      value={form.lat}
                      onChange={(event) => handleChange('lat', event.target.value)}
                    />
                  </Field>
                  <Field label="Longitude">
                    <Input
                      type="number"
                      step="0.0001"
                      value={form.lon}
                      onChange={(event) => handleChange('lon', event.target.value)}
                    />
                  </Field>
                  <Field label="Elevation (m)">
                    <Input
                      type="number"
                      step="1"
                      value={form.elevation}
                      onChange={(event) => handleChange('elevation', event.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Deployment notes">
                  <Textarea
                    rows={4}
                    placeholder="Optional context about the station deployment or the monitoring mission."
                    value={form.notes}
                    onChange={(event) => handleChange('notes', event.target.value)}
                  />
                </Field>
                <div className="rounded-xl border border-bg-border bg-bg-elevated/20 p-3 text-sm text-text-secondary">
                  New station IDs are assigned automatically by the backend as EG-XXX. Removing a station means decommissioning it from the platform registry.
                  The physical hardware may still exist in the field until a separate maintenance mission removes it.
                </div>
                <Button type="submit" variant="primary" icon={PlusCircle} loading={saving} className="w-full">
                  Register Station
                </Button>
              </form>
            </CardBody>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader
                icon={RadioTower}
                title="Active Stations"
                subtitle="Search, review, and decommission active platform entries."
                action={
                  <Input
                    icon={Search}
                    placeholder="Search stations..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    wrapperClassName="w-52"
                  />
                }
              />
              {loading ? (
                <CardBody className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 rounded-xl" />
                  ))}
                </CardBody>
              ) : filteredActive.length === 0 ? (
                <CardBody>
                  <EmptyState
                    icon={Search}
                    title="No active stations found"
                    description="Try a different search term or register a new station."
                  />
                </CardBody>
              ) : (
                <div className="divide-y divide-bg-border">
                  {filteredActive.map((station) => (
                    <StationRow
                      key={station.id}
                      station={station}
                      onDecommission={() => setConfirm({ open: true, station })}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader
                icon={Archive}
                title="Archived Stations"
                subtitle="Decommissioned entries remain here for audit history."
              />
              {loading ? (
                <CardBody>
                  <Skeleton className="h-24 rounded-xl" />
                </CardBody>
              ) : archivedStations.length === 0 ? (
                <CardBody>
                  <EmptyState
                    icon={Archive}
                    title="No archived stations"
                    description="Decommissioned stations will appear in this list."
                  />
                </CardBody>
              ) : (
                <div className="divide-y divide-bg-border">
                  {archivedStations.map((station) => (
                    <div key={station.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-text-muted">{station.id}</span>
                          <span className="text-sm font-medium text-text-primary">{station.name}</span>
                          <Badge tone="warning" size="xs">
                            Archived
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-text-muted">
                          Archived {timeAgo(station.archivedAt)} | {formatDateTime(station.archivedAt)}
                        </div>
                      </div>
                      <span className="text-xs text-text-muted">
                        Removed from active dashboards and reports
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageBody>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, station: null })}
        onConfirm={handleDecommission}
        loading={saving}
        title={confirm.station ? `Decommission ${confirm.station.id}` : 'Decommission station'}
        description={
          confirm.station
            ? `This removes ${confirm.station.name} from active monitoring dashboards and reports. It does not mean the physical field hardware has already been recovered.`
            : ''
        }
        confirmLabel="Decommission"
        confirmPhrase={confirm.station ? `REMOVE ${confirm.station.id}` : undefined}
      />
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

function StationRow({ station, onDecommission }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-text-muted">{station.id}</span>
          <span className="text-sm font-medium text-text-primary">{station.name}</span>
          <Badge tone={station.online ? 'success' : 'danger'} size="xs">
            {station.state}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span>{station.region}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} />
            {formatCoordinates(station.coordinates.lat, station.coordinates.lon)}
          </span>
          <span>Elevation {station.elevation} m</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={`/stations/${station.id}`}
          className="rounded-md border border-bg-border px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
        >
          Open
        </Link>
        <Button size="sm" variant="danger" icon={Trash2} onClick={onDecommission}>
          Remove
        </Button>
      </div>
    </div>
  )
}
