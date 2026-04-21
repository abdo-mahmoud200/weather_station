import { useMemo, useState } from 'react'
import { FileText, LayoutGrid, RotateCcw, Save, SlidersHorizontal, TimerReset } from 'lucide-react'
import PageWrapper, { PageBody, PageHeader } from '../components/layout/PageWrapper'
import Card, { CardBody, CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import { Select } from '../components/common/Form'
import { useToast } from '../components/common/Toast'
import {
  DEFAULT_PREFERENCES,
  getUserPreferences,
  resetUserPreferences,
  saveUserPreferences,
} from '../utils/preferences'

const DASHBOARD_VIEW_LABELS = {
  all: 'All stations',
  online: 'Online only',
  warnings: 'Warnings only',
  offline: 'Offline only',
  powersave: 'Powersave only',
}

export default function Preferences() {
  const toast = useToast()
  const [savedPreferences, setSavedPreferences] = useState(() => getUserPreferences())
  const [preferences, setPreferences] = useState(() => getUserPreferences())

  const dirty = useMemo(
    () => JSON.stringify(preferences) !== JSON.stringify(savedPreferences),
    [preferences, savedPreferences],
  )

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }))
  }

  const handleSave = () => {
    const next = saveUserPreferences(preferences)
    setPreferences(next)
    setSavedPreferences(next)
    toast.success('Preferences saved locally')
  }

  const handleReset = () => {
    const next = resetUserPreferences()
    setPreferences(next)
    setSavedPreferences(next)
    toast.info('Preferences reset to defaults')
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Preferences"
        description="Control default dashboard behavior, refresh cadence, and reporting preferences."
        actions={
          <>
            <Badge tone="info" size="md">
              Local browser settings
            </Badge>
            <Button variant="ghost" icon={RotateCcw} onClick={handleReset}>
              Reset
            </Button>
            <Button variant="primary" icon={Save} onClick={handleSave} disabled={!dirty}>
              Save Changes
            </Button>
          </>
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader
                icon={TimerReset}
                title="Refresh Behavior"
                subtitle="Applies to dashboard, station detail, control panel, alerts, and sidebar alert counts."
              />
              <CardBody className="space-y-4">
                <PreferenceRow
                  label="Auto-refresh interval"
                  description="Choose how often live pages refresh their data automatically."
                >
                  <Select
                    value={preferences.autoRefreshSeconds}
                    onChange={(event) =>
                      updatePreference('autoRefreshSeconds', Number(event.target.value))
                    }
                    className="w-full sm:w-48"
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={120}>120 seconds</option>
                  </Select>
                </PreferenceRow>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                icon={SlidersHorizontal}
                title="Default Views"
                subtitle="These defaults are used when the relevant page opens."
              />
              <CardBody className="space-y-4">
                <PreferenceRow
                  label="Dashboard default filter"
                  description="Set the first view shown in the stations grid on the main dashboard."
                >
                  <Select
                    value={preferences.defaultDashboardView}
                    onChange={(event) =>
                      updatePreference('defaultDashboardView', event.target.value)
                    }
                    className="w-full sm:w-48"
                  >
                    <option value="all">All stations</option>
                    <option value="online">Online only</option>
                    <option value="warnings">Warnings only</option>
                    <option value="offline">Offline only</option>
                    <option value="powersave">Powersave only</option>
                  </Select>
                </PreferenceRow>

                <PreferenceRow
                  label="Reports default export format"
                  description="Preselect the format used on the reports page."
                >
                  <Select
                    value={preferences.defaultReportFormat}
                    onChange={(event) =>
                      updatePreference('defaultReportFormat', event.target.value)
                    }
                    className="w-full sm:w-48"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="pdf">PDF</option>
                  </Select>
                </PreferenceRow>

                <PreferenceRow
                  label="Reports preview rows"
                  description="Limit how many rows appear in the on-screen preview table before truncation."
                >
                  <Select
                    value={preferences.reportPreviewRows}
                    onChange={(event) =>
                      updatePreference('reportPreviewRows', Number(event.target.value))
                    }
                    className="w-full sm:w-48"
                  >
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                    <option value={250}>250 rows</option>
                  </Select>
                </PreferenceRow>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader
                icon={LayoutGrid}
                title="Current Effective Settings"
                subtitle="A quick summary of what will be used after you save."
              />
              <CardBody className="space-y-3 text-sm text-text-secondary">
                <SummaryItem
                  label="Auto-refresh"
                  value={`${preferences.autoRefreshSeconds} seconds`}
                />
                <SummaryItem
                  label="Dashboard view"
                  value={DASHBOARD_VIEW_LABELS[preferences.defaultDashboardView]}
                />
                <SummaryItem
                  label="Reports format"
                  value={preferences.defaultReportFormat.toUpperCase()}
                />
                <SummaryItem
                  label="Preview rows"
                  value={`${preferences.reportPreviewRows} rows`}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                icon={FileText}
                title="Behavior Notes"
                subtitle="What these settings affect right now."
              />
              <CardBody className="space-y-2 text-sm text-text-secondary">
                <p>Saved preferences are stored locally in this browser only.</p>
                <p>Auto-refresh changes apply when live pages are opened again after saving.</p>
                <p>Dashboard and reports defaults are used the next time those pages load.</p>
                <p>
                  Reset returns everything to:
                  <span className="ml-1 font-mono text-text-primary">
                    {DEFAULT_PREFERENCES.autoRefreshSeconds}s / {DEFAULT_PREFERENCES.defaultDashboardView} /{' '}
                    {DEFAULT_PREFERENCES.defaultReportFormat.toUpperCase()} / {DEFAULT_PREFERENCES.reportPreviewRows}
                  </span>
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageBody>
    </PageWrapper>
  )
}

function PreferenceRow({ label, description, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-bg-border bg-bg-elevated/30 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-xl">
        <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SummaryItem({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-bg-border bg-bg-elevated/30 px-3 py-2">
      <span className="text-text-muted">{label}</span>
      <span className="font-mono text-text-primary">{value}</span>
    </div>
  )
}
