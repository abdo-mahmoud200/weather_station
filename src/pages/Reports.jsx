import { useEffect, useMemo, useState } from 'react'
import { Calendar, Check, ChevronDown, Download, FileJson, FileText, FileType } from 'lucide-react'
import PageWrapper, { PageBody, PageHeader } from '../components/layout/PageWrapper'
import Card, { CardBody, CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import { Checkbox, Input } from '../components/common/Form'
import EmptyState from '../components/common/EmptyState'
import { Skeleton } from '../components/common/Skeleton'
import { useStations } from '../hooks/useStations'
import { useToast } from '../components/common/Toast'
import { fetchReportData } from '../services/api'
import { downloadFile, formatDateTime, toCSV, toReportPdf } from '../utils/formatters'
import { getUserPreferences } from '../utils/preferences'
import { isValidDateRange } from '../utils/validators'

const DATA_TYPES = [
  { key: 'temperature', label: 'Temperature' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'wind', label: 'Wind' },
  { key: 'rainfall', label: 'Rainfall' },
]

const FORMATS = [
  { key: 'csv', label: 'CSV', icon: FileText },
  { key: 'json', label: 'JSON', icon: FileJson },
  { key: 'pdf', label: 'PDF', icon: FileType },
]

function defaultRange() {
  const end = new Date()
  const start = new Date(end.getTime() - 6 * 3600 * 1000)
  return {
    from: toLocalInput(start),
    to: toLocalInput(end),
  }
}

function toLocalInput(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}

export default function Reports() {
  const toast = useToast()
  const { stations, loading: stationsLoading } = useStations()
  const initialRange = defaultRange()
  const preferences = useMemo(() => getUserPreferences(), [])
  const previewRowLimit = preferences.reportPreviewRows

  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [selectedStations, setSelectedStations] = useState([])
  const [types, setTypes] = useState(['temperature', 'pressure', 'wind', 'rainfall'])
  const [format, setFormat] = useState(preferences.defaultReportFormat)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [stationPickerOpen, setStationPickerOpen] = useState(false)

  useEffect(() => {
    if (selectedStations.length === 0 && stations.length > 0) {
      setSelectedStations(stations.slice(0, 3).map((station) => station.id))
    }
  }, [stations, selectedStations.length])

  const rangeValid = useMemo(() => isValidDateRange(from, to), [from, to])

  const toggleStation = (id) => {
    setSelectedStations((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    )
  }

  const toggleType = (key) => {
    setTypes((items) => (items.includes(key) ? items.filter((item) => item !== key) : [...items, key]))
  }

  const selectAllStations = () => setSelectedStations(stations.map((station) => station.id))
  const clearStations = () => setSelectedStations([])

  const preview = async () => {
    if (!rangeValid) {
      toast.warning('Please select a valid date range.')
      return
    }

    if (selectedStations.length === 0 || types.length === 0) {
      toast.warning('Select at least one station and one data type.')
      return
    }

    setLoading(true)
    try {
      const response = await fetchReportData({
        stationIds: selectedStations,
        types,
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      })
      setRows(response)
      if (response.length === 0) toast.info('No data found in selected range.')
    } catch (error) {
      toast.error(error.message || 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    if (rows.length === 0) {
      toast.warning('Generate a preview first.')
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseName = `wws-report-${timestamp}`
    const exportMeta = { from, to, types, selectedStations }

    if (format === 'csv') {
      downloadFile(`${baseName}.csv`, toCSV(rows), 'text/csv;charset=utf-8')
      return
    }

    if (format === 'json') {
      downloadFile(`${baseName}.json`, JSON.stringify(rows, null, 2), 'application/json')
      return
    }

    downloadFile(`${baseName}.pdf`, toReportPdf(rows, exportMeta), 'application/pdf')
    toast.success('PDF export generated')
  }

  const columns = useMemo(() => {
    if (rows.length === 0) return []
    return Object.keys(rows[0])
  }, [rows])

  const stationSummary = useMemo(() => {
    if (selectedStations.length === 0) return 'No stations selected'
    if (selectedStations.length === 1) return selectedStations[0]
    if (selectedStations.length === 2) return selectedStations.join(', ')
    return `${selectedStations.length} stations selected`
  }, [selectedStations])

  return (
    <PageWrapper>
      <PageHeader
        title="Reports & Data Export"
        description="Build a dataset, preview it, then export as CSV, JSON, or PDF."
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader title="Report Parameters" subtitle="Choose stations, metrics, and range." />
            <CardBody>
              <div className="space-y-4">
                <div>
                  <Label icon={Calendar}>Date range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="datetime-local"
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                      aria-label="From"
                    />
                    <Input
                      type="datetime-local"
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                      aria-label="To"
                    />
                  </div>
                  {!rangeValid && (
                    <p className="mt-1 text-[11px] text-accent-warning">
                      End date must be after start date.
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>Stations ({selectedStations.length}/{stations.length})</Label>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setStationPickerOpen((value) => !value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-bg-border bg-bg-base px-3 text-left text-sm text-text-primary transition-colors hover:border-brand-400/40"
                    >
                      <span className="truncate">{stationSummary}</span>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 text-text-muted transition-transform ${
                          stationPickerOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {stationPickerOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-xl border border-bg-border bg-bg-surface p-2 shadow-2xl">
                        <div className="mb-2 flex items-center justify-between px-1">
                          <div className="text-[11px] uppercase tracking-wider text-text-muted">
                            Multi-select stations
                          </div>
                          <div className="flex gap-2 text-[11px]">
                            <button
                              className="text-brand-300 hover:text-brand-200"
                              onClick={selectAllStations}
                            >
                              Select all
                            </button>
                            <button
                              className="text-text-muted hover:text-text-primary"
                              onClick={clearStations}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto rounded-lg border border-bg-border bg-bg-base/40 p-2">
                          {stationsLoading ? (
                            <Skeleton className="h-20 w-full" />
                          ) : (
                            <ul className="space-y-1">
                              {stations.map((station) => {
                                const checked = selectedStations.includes(station.id)

                                return (
                                  <li key={station.id}>
                                    <button
                                      onClick={() => toggleStation(station.id)}
                                      className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                                        checked
                                          ? 'bg-brand-500/10 text-text-primary'
                                          : 'hover:bg-bg-elevated text-text-secondary'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <div className="truncate">
                                          <span className="font-mono text-[11px] text-text-muted">
                                            {station.id}
                                          </span>{' '}
                                          <span className="text-sm text-text-primary">
                                            {station.name}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-text-muted">
                                          {station.region}
                                        </div>
                                      </div>
                                      <span
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                          checked
                                            ? 'border-brand-400/60 bg-brand-500/10 text-brand-300'
                                            : 'border-bg-border text-transparent'
                                        }`}
                                      >
                                        <Check size={12} />
                                      </span>
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Data types</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DATA_TYPES.map((type) => (
                      <Checkbox
                        key={type.key}
                        label={type.label}
                        checked={types.includes(type.key)}
                        onChange={() => toggleType(type.key)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Export format</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map((entry) => {
                      const Icon = entry.icon
                      const active = format === entry.key

                      return (
                        <button
                          key={entry.key}
                          onClick={() => setFormat(entry.key)}
                          className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                            active
                              ? 'border-brand-400/60 bg-brand-500/10 text-brand-200'
                              : 'border-bg-border bg-bg-elevated/40 text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <Icon size={14} /> {entry.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="primary" onClick={preview} loading={loading}>
                    Generate Preview
                  </Button>
                  <Button icon={Download} onClick={download} disabled={rows.length === 0}>
                    Download
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Preview"
              subtitle={
                rows.length > 0
                  ? `${rows.length.toLocaleString()} rows | ${selectedStations.length} stations`
                  : 'Preview will appear here after generation.'
              }
            />

            {loading ? (
              <CardBody>
                <Skeleton className="h-[360px] w-full rounded-md" />
              </CardBody>
            ) : rows.length === 0 ? (
              <CardBody>
                <EmptyState
                  icon={FileText}
                  title="No preview yet"
                  description="Configure parameters and click Generate Preview to see sample rows."
                />
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-xs">
                  <thead>
                    <tr className="sticky top-0 bg-bg-surface">
                      {columns.map((column) => (
                        <th
                          key={column}
                          className="border-b border-bg-border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, previewRowLimit).map((row, index) => (
                      <tr key={index} className="odd:bg-bg-base/40">
                        {columns.map((column) => (
                          <td
                            key={column}
                            className={`border-b border-bg-border px-3 py-1.5 ${
                              column === 'timestamp'
                                ? 'font-mono text-text-secondary'
                                : 'text-text-primary'
                            }`}
                          >
                            {column === 'timestamp' ? formatDateTime(row[column]) : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > previewRowLimit && (
                  <div className="border-t border-bg-border px-4 py-2 text-center text-[11px] text-text-muted">
                    Showing first {previewRowLimit} rows of {rows.length.toLocaleString()}.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </PageBody>
    </PageWrapper>
  )
}

function Label({ icon: Icon, children }) {
  return (
    <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
      {Icon && <Icon size={12} />}
      {children}
    </label>
  )
}
