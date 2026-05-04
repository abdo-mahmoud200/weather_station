import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  FileUp,
  History,
  Play,
  Power,
  Radio,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Terminal,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react'
import PageWrapper, { PageBody, PageHeader } from '../layout/PageWrapper'
import Button from '../common/Button'
import Card, { CardBody, CardHeader } from '../common/Card'
import Badge from '../common/Badge'
import ConfirmDialog from '../common/ConfirmDialog'
import ProgressBar from '../common/ProgressBar'
import { Input, Select, Textarea } from '../common/Form'
import { Skeleton } from '../common/Skeleton'
import { useToast } from '../common/Toast'
import { useStation } from '../../hooks/useStations'
import useAutoRefresh from '../../hooks/useAutoRefresh'
import useRefreshInterval from '../../hooks/useRefreshInterval'
import {
  fetchUpdateHistory,
  sendStationCommand,
  uploadSoftware,
} from '../../services/api'
import { formatDateTime } from '../../utils/formatters'
import { isValidCommand, isValidSoftwareFile } from '../../utils/validators'

const COMMANDS = [
  {
    key: 'restart',
    label: 'Restart',
    icon: Play,
    variant: 'success',
    phrase: 'RESTART',
    allow: (station) => station.state === 'Shutdown',
    disabledMsg: 'Station must be Shutdown to Restart.',
    description: (station) =>
      `This will bring station ${station.id} back online. Telemetry will resume within ~30 seconds.`,
  },
  {
    key: 'shutdown',
    label: 'Shutdown',
    icon: Power,
    variant: 'danger',
    phrase: 'SHUTDOWN',
    allow: (station) => station.state !== 'Shutdown',
    disabledMsg: 'Station is already Shutdown.',
    description: (station) =>
      `This will power down station ${station.id}. All data collection halts until restarted on-site or remotely.`,
  },
  {
    key: 'powersave',
    label: 'Powersave',
    icon: BatteryCharging,
    variant: 'info',
    phrase: null,
    allow: () => true,
    description: (station) =>
      station.state === 'Powersave'
        ? `Disable power-save mode on ${station.id}?`
        : `Enable power-save mode on ${station.id}? Non-essential sensors will be throttled.`,
  },
  {
    key: 'reconfigure',
    label: 'Reconfigure',
    icon: SlidersHorizontal,
    variant: 'orange',
    phrase: null,
    allow: () => true,
    description: (station) =>
      `Update operating settings for ${station.id}.`,
  },
  {
    key: 'software_update',
    label: 'Software Update',
    icon: Upload,
    variant: 'orange',
    phrase: null,
    allow: () => true,
    description: (station) =>
      `Upload a new firmware or configuration bundle for ${station.id}.`,
  },
  {
    key: 'remote',
    label: 'Remote Control',
    icon: Terminal,
    variant: 'purple',
    phrase: null,
    allow: (station) => station.state !== 'Shutdown',
    disabledMsg: 'Shutdown stations cannot accept remote commands.',
    description: () => 'Open the remote instrument control panel.',
  },
]

const MAINTENANCE_ACTIONS = {
  active_alerts: {
    command: 'close_alerts',
    label: 'Close Reviewed Alerts',
    icon: CheckCircle2,
  },
  battery_low: {
    command: 'reset_battery',
    label: 'Reset Battery',
    icon: BatteryCharging,
  },
  signal_weak: {
    command: 'stabilize_signal',
    label: 'Stabilize Signal',
    icon: Radio,
  },
  wind_strong: {
    command: 'calibrate_instruments',
    label: 'Calibrate Instruments',
    icon: Wrench,
  },
  temperature_high: {
    command: 'calibrate_instruments',
    label: 'Calibrate Instruments',
    icon: Wrench,
  },
  instrument_check: {
    command: 'calibrate_instruments',
    label: 'Calibrate Instruments',
    icon: Wrench,
  },
}

export default function StationControlPanel({ stationId }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { station, loading, refresh } = useStation(stationId)
  const refreshIntervalMs = useRefreshInterval()
  useAutoRefresh(refresh, refreshIntervalMs, [stationId])

  const [confirm, setConfirm] = useState({ open: false, cmd: null })
  const [cmdLoading, setCmdLoading] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState('')
  const [remoteOpen, setRemoteOpen] = useState(false)
  const [reconfigureOpen, setReconfigureOpen] = useState(false)
  const [updateOpen, setUpdateOpen] = useState(false)

  const [instrument, setInstrument] = useState('anemometer')
  const [cmdText, setCmdText] = useState('')
  const [cmdResponse, setCmdResponse] = useState('')
  const [cmdSending, setCmdSending] = useState(false)

  const [readingInterval, setReadingInterval] = useState(10)
  const [alertProfile, setAlertProfile] = useState('desert-extreme')
  const [transmissionMode, setTransmissionMode] = useState('balanced')
  const [configFileName, setConfigFileName] = useState('')
  const [reconfiguring, setReconfiguring] = useState(false)

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!stationId) return
    fetchUpdateHistory(stationId).then(setHistory).catch(() => setHistory([]))
  }, [stationId])

  const runCommand = async () => {
    if (!confirm.cmd || !station) return

    setCmdLoading(true)
    try {
      await sendStationCommand(station.id, confirm.cmd.key)
      toast.success(`${confirm.cmd.label} sent`, { title: station.id })
      await refresh()
    } catch (error) {
      toast.error(error.message || 'Command failed')
    } finally {
      setCmdLoading(false)
      setConfirm({ open: false, cmd: null })
    }
  }

  const runMaintenance = async (action) => {
    if (!station || !action) return

    setMaintenanceLoading(action.command)
    try {
      await sendStationCommand(station.id, action.command)
      toast.success(`${action.label} completed`, { title: station.id })
      await refresh()
    } catch (error) {
      toast.error(error.message || 'Maintenance action failed')
    } finally {
      setMaintenanceLoading('')
    }
  }

  const sendRemote = async () => {
    if (!station) return
    if (!isValidCommand(cmdText)) {
      toast.warning('Command must be alphanumeric (max 120 chars).')
      return
    }

    setCmdSending(true)
    try {
      const response = await sendStationCommand(station.id, 'remote', {
        instrument,
        command: cmdText.trim(),
      })
      setCmdResponse(response.response || 'OK')
      toast.success('Command executed')
      await refresh()
    } catch (error) {
      setCmdResponse(`ERR ${error.message || 'failed'}`)
      toast.error('Remote command failed')
    } finally {
      setCmdSending(false)
    }
  }

  const loadReconfigureFile = async (selectedFile) => {
    if (!selectedFile) return

    try {
      const parsed = JSON.parse(await selectedFile.text())
      const settings = parsed.settings || parsed

      if (parsed.stationId && station?.id && parsed.stationId !== station.id) {
        toast.error(`Config file is for ${parsed.stationId}, but current station is ${station.id}. File ignored.`)
        setConfigFileName('')
        return
      }

      if (settings.readingIntervalSeconds !== undefined) {
        setReadingInterval(settings.readingIntervalSeconds)
      }
      if (settings.alertProfile) {
        setAlertProfile(settings.alertProfile)
      }
      if (settings.transmissionMode) {
        setTransmissionMode(settings.transmissionMode)
      }

      setConfigFileName(selectedFile.name)
      toast.success('Configuration file loaded')
    } catch {
      toast.error('Invalid configuration JSON file')
      setConfigFileName('')
    }
  }

  const doReconfigure = async () => {
    if (!station) return

    const interval = Number(readingInterval)
    if (!Number.isFinite(interval) || interval < 5 || interval > 3600) {
      toast.warning('Reading interval must be between 5 and 3600 seconds.')
      return
    }

    setReconfiguring(true)
    try {
      await sendStationCommand(station.id, 'reconfigure', {
        settings: {
          readingIntervalSeconds: interval,
          alertProfile,
          transmissionMode,
        },
      })
      toast.success('Configuration sent', { title: station.id })
      await refresh()
    } catch (error) {
      toast.error(error.message || 'Reconfigure failed')
    } finally {
      setReconfiguring(false)
    }
  }

  const doUpload = async () => {
    if (!station) return
    if (!isValidSoftwareFile(file)) {
      toast.warning('Choose a valid update file (.bin/.img/.tar/.tgz/.zip/.pkg, <= 50 MB).')
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const response = await uploadSoftware(station.id, file, (value) => setProgress(value))
      toast.success(`Software updated to ${response.version}`, { title: station.id })
      setHistory((items) => [
        {
          version: response.version,
          installedAt: response.installedAt,
          status: 'success',
          notes: `Uploaded ${response.fileName}.`,
        },
        ...items,
      ])
      setFile(null)
      await refresh()
    } catch (error) {
      toast.error(error.message || 'Update failed')
    } finally {
      setUploading(false)
    }
  }

  if (!loading && !station) {
    return (
      <PageWrapper>
        <PageBody>
          <p className="text-text-secondary">Station not found.</p>
          <Button className="mt-3" onClick={() => navigate('/')}>
            Back to dashboard
          </Button>
        </PageBody>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader
        title={station ? `Control - ${station.name}` : 'Control Panel'}
        description={station ? `Direct operations for ${station.id}` : 'Loading...'}
        breadcrumbs={
          station
            ? [
                { label: 'Dashboard', to: '/' },
                { label: station.id, to: `/stations/${station.id}` },
                { label: 'Control' },
              ]
            : undefined
        }
        actions={
          station && (
            <>
              <Badge tone="info" dot size="md">
                {station.state}
              </Badge>
              <Button icon={RotateCcw} onClick={() => navigate(`/stations/${station.id}`)}>
                Back to detail
              </Button>
            </>
          )
        }
      />

      <PageBody>
        {loading || !station ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-xl lg:col-span-2" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Station Commands"
                subtitle="Dangerous actions require a typed confirmation phrase."
              />
              <CardBody>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {COMMANDS.map((command) => {
                    const allowed = command.allow(station)

                    return (
                      <div
                        key={command.key}
                        className="flex flex-col justify-between rounded-lg border border-bg-border bg-bg-elevated/40 p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                                command.variant === 'success'
                                  ? 'border-brand-400/30 bg-brand-500/10 text-brand-300'
                                  : command.variant === 'danger'
                                    ? 'border-accent-danger/30 bg-accent-dangerSoft text-accent-danger'
                                    : command.variant === 'info'
                                      ? 'border-accent-info/30 bg-accent-infoSoft text-accent-info'
                                      : command.variant === 'orange'
                                        ? 'border-accent-orange/30 bg-accent-orangeSoft text-accent-orange'
                                        : 'border-accent-purple/30 bg-accent-purpleSoft text-accent-purple'
                              }`}
                            >
                              <command.icon size={15} strokeWidth={2.25} />
                            </span>
                            <span className="text-sm font-semibold text-text-primary">
                              {command.label}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-text-muted">{command.description(station)}</p>
                          {!allowed && command.disabledMsg && (
                            <p className="mt-2 text-[11px] text-accent-warning">
                              {command.disabledMsg}
                            </p>
                          )}
                        </div>
                        <Button
                          className="mt-3 w-full"
                          variant={command.variant}
                          disabled={!allowed}
                          onClick={() => {
                            if (command.key === 'remote') setRemoteOpen(true)
                            else if (command.key === 'reconfigure') setReconfigureOpen(true)
                            else if (command.key === 'software_update') setUpdateOpen(true)
                            else setConfirm({ open: true, cmd: command })
                          }}
                          icon={command.icon}
                        >
                          {command.label}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>

            {station.warningReasons?.length > 0 && (
              <Card>
                <CardHeader
                  icon={AlertTriangle}
                  title="Warning Diagnosis"
                  subtitle="Review the cause, then run the matching maintenance action."
                />
                <CardBody>
                  <ul className="space-y-2">
                    {station.warningReasons.map((reason) => {
                      const action = MAINTENANCE_ACTIONS[reason.code]
                      const ActionIcon = action?.icon

                      return (
                        <li
                          key={reason.code}
                          className="flex flex-col gap-3 rounded-lg border border-accent-warning/25 bg-accent-warningSoft/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                              <AlertTriangle size={14} className="text-accent-warning" />
                              {reason.label}
                            </div>
                            <p className="mt-1 text-xs text-text-muted">{reason.detail}</p>
                          </div>
                          {action && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={ActionIcon}
                              loading={maintenanceLoading === action.command}
                              onClick={() => runMaintenance(action)}
                              className="w-full sm:w-auto"
                            >
                              {action.label}
                            </Button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </CardBody>
              </Card>
            )}

            {remoteOpen && (
              <Card>
                <CardHeader
                  icon={Terminal}
                  title="Remote Instrument Control"
                  subtitle="Send direct commands to a specific instrument."
                  action={
                    <Button size="sm" variant="ghost" onClick={() => setRemoteOpen(false)}>
                      Close
                    </Button>
                  }
                />
                <CardBody>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_auto]">
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
                        Instrument
                      </label>
                      <Select
                        value={instrument}
                        onChange={(event) => setInstrument(event.target.value)}
                        className="w-full"
                      >
                        <option value="anemometer">Anemometer</option>
                        <option value="barometer">Barometer</option>
                        <option value="groundThermometer">Ground Thermometer</option>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
                        Command
                      </label>
                      <Input
                        placeholder="e.g. READ_NOW or CAL=auto"
                        value={cmdText}
                        spellCheck={false}
                        onChange={(event) => setCmdText(event.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        icon={Send}
                        variant="primary"
                        loading={cmdSending}
                        onClick={sendRemote}
                        disabled={!cmdText.trim()}
                        className="w-full lg:w-auto"
                      >
                        Send
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-text-muted">
                        Response
                      </span>
                      {cmdResponse && (
                        <button
                          className="text-[11px] text-text-muted hover:text-text-primary"
                          onClick={() => setCmdResponse('')}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <Textarea
                      readOnly
                      rows={6}
                      value={cmdResponse || '> awaiting command...'}
                      className="font-mono text-xs"
                    />
                  </div>
                </CardBody>
              </Card>
            )}

            {reconfigureOpen && (
              <Card>
                <CardHeader
                  icon={SlidersHorizontal}
                  title="Station Reconfiguration"
                  subtitle="Apply operating settings to the selected station."
                  action={
                    <Button size="sm" variant="ghost" onClick={() => setReconfigureOpen(false)}>
                      Close
                    </Button>
                  }
                />
                <CardBody>
                  <div className="mb-4 rounded-lg border border-dashed border-bg-border bg-bg-base/40 p-3">
                    <label
                      htmlFor="reconfigure-file"
                      className="flex cursor-pointer flex-col gap-1 text-sm text-text-secondary hover:text-text-primary"
                    >
                      <span className="font-medium text-text-primary">Load configuration file</span>
                      <span className="text-xs text-text-muted">
                        {configFileName || 'Choose one of the sample .json files from reconfigure-files/.'}
                      </span>
                    </label>
                    <input
                      id="reconfigure-file"
                      type="file"
                      className="hidden"
                      accept=".json,application/json"
                      onChange={(event) => loadReconfigureFile(event.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_220px_220px_auto]">
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
                        Reading interval
                      </label>
                      <Input
                        type="number"
                        min="5"
                        max="3600"
                        step="5"
                        value={readingInterval}
                        onChange={(event) => setReadingInterval(event.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
                        Alert profile
                      </label>
                      <Select
                        value={alertProfile}
                        onChange={(event) => setAlertProfile(event.target.value)}
                        className="w-full"
                      >
                        <option value="desert-standard">Desert standard</option>
                        <option value="desert-extreme">Desert extreme</option>
                        <option value="maintenance">Maintenance</option>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
                        Transmission
                      </label>
                      <Select
                        value={transmissionMode}
                        onChange={(event) => setTransmissionMode(event.target.value)}
                        className="w-full"
                      >
                        <option value="balanced">Balanced</option>
                        <option value="realtime">Realtime</option>
                        <option value="low-power">Low power</option>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        icon={SlidersHorizontal}
                        variant="primary"
                        loading={reconfiguring}
                        onClick={doReconfigure}
                        className="w-full lg:w-auto"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    Applying settings moves the station to Configuring briefly, then it returns to normal telemetry.
                  </p>
                </CardBody>
              </Card>
            )}

            {updateOpen && (
              <Card>
                <CardHeader
                  icon={FileUp}
                  title="Software Update"
                  subtitle={`Current firmware: ${station.softwareVersion}`}
                  action={
                    <Button size="sm" variant="ghost" onClick={() => setUpdateOpen(false)}>
                      Close
                    </Button>
                  }
                />
                <CardBody>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                    <div>
                      <label
                        htmlFor="fw-file"
                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-bg-border bg-bg-base/40 px-4 py-8 text-center text-text-secondary hover:border-brand-400/60 hover:text-text-primary"
                      >
                        <FileUp size={22} className="text-text-muted" />
                        <div className="text-sm">
                          {file ? (
                            <>
                              Selected: <span className="font-mono">{file.name}</span>
                            </>
                          ) : (
                            <>Click to select a firmware bundle</>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          Accepted: .bin .img .tar .tgz .zip .pkg - max 50 MB
                        </div>
                        <input
                          id="fw-file"
                          type="file"
                          className="hidden"
                          accept=".bin,.img,.tar,.tgz,.zip,.pkg"
                          onChange={(event) => setFile(event.target.files?.[0] || null)}
                        />
                      </label>

                      {uploading && (
                        <div className="mt-4">
                          <ProgressBar
                            value={progress}
                            label={`Uploading and verifying (${file?.name})`}
                            tone="brand"
                          />
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          icon={Upload}
                          variant="primary"
                          loading={uploading}
                          onClick={doUpload}
                          disabled={!file}
                        >
                          Upload and Install
                        </Button>
                        <Button variant="ghost" onClick={() => setFile(null)} disabled={uploading}>
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-bg-border bg-bg-base/40">
                      <div className="flex items-center gap-2 border-b border-bg-border px-3 py-2 text-xs text-text-secondary">
                        <History size={13} /> Update history
                      </div>
                      <ul className="divide-y divide-bg-border text-xs">
                        {history.length === 0 && (
                          <li className="px-3 py-4 text-text-muted">No updates recorded.</li>
                        )}
                        {history.map((item) => (
                          <li key={`${item.version}-${item.installedAt}`} className="flex items-start gap-2 px-3 py-2">
                            <span
                              className={`mt-0.5 ${
                                item.status === 'success'
                                  ? 'text-brand-300'
                                  : 'text-accent-warning'
                              }`}
                            >
                              {item.status === 'success' ? (
                                <CheckCircle2 size={13} />
                              ) : (
                                <XCircle size={13} />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="metric-value font-semibold text-text-primary">
                                  v{item.version}
                                </span>
                                <span className="text-[10px] text-text-muted">
                                  {formatDateTime(item.installedAt)}
                                </span>
                              </div>
                              <p className="text-text-muted">{item.notes}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}
      </PageBody>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, cmd: null })}
        onConfirm={runCommand}
        loading={cmdLoading}
        title={confirm.cmd ? `Confirm: ${confirm.cmd.label}` : ''}
        description={confirm.cmd && station ? confirm.cmd.description(station) : ''}
        confirmLabel={confirm.cmd?.label || 'Confirm'}
        variant={confirm.cmd?.variant === 'success' ? 'primary' : confirm.cmd?.variant}
        confirmPhrase={confirm.cmd?.phrase || undefined}
      />
    </PageWrapper>
  )
}
