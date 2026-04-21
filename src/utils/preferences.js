export const DEFAULT_PREFERENCES = {
  autoRefreshSeconds: 30,
  defaultDashboardView: 'all',
  defaultReportFormat: 'csv',
  reportPreviewRows: 100,
}

const STORAGE_KEY = 'wws.preferences'

const REFRESH_OPTIONS = [15, 30, 60, 120]
const DASHBOARD_VIEWS = ['all', 'online', 'warnings', 'offline', 'powersave']
const REPORT_FORMATS = ['csv', 'json', 'pdf']
const REPORT_ROW_OPTIONS = [25, 50, 100, 250]

export function getUserPreferences() {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return normalizePreferences(JSON.parse(raw))
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveUserPreferences(nextPreferences) {
  const normalized = normalizePreferences(nextPreferences)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent('wws:preferences-changed', { detail: normalized }))
  }

  return normalized
}

export function resetUserPreferences() {
  return saveUserPreferences(DEFAULT_PREFERENCES)
}

export function getRefreshIntervalMs() {
  return getUserPreferences().autoRefreshSeconds * 1000
}

function normalizePreferences(raw = {}) {
  const autoRefreshSeconds = REFRESH_OPTIONS.includes(Number(raw.autoRefreshSeconds))
    ? Number(raw.autoRefreshSeconds)
    : DEFAULT_PREFERENCES.autoRefreshSeconds

  const defaultDashboardView = DASHBOARD_VIEWS.includes(raw.defaultDashboardView)
    ? raw.defaultDashboardView
    : DEFAULT_PREFERENCES.defaultDashboardView

  const defaultReportFormat = REPORT_FORMATS.includes(raw.defaultReportFormat)
    ? raw.defaultReportFormat
    : DEFAULT_PREFERENCES.defaultReportFormat

  const reportPreviewRows = REPORT_ROW_OPTIONS.includes(Number(raw.reportPreviewRows))
    ? Number(raw.reportPreviewRows)
    : DEFAULT_PREFERENCES.reportPreviewRows

  return {
    autoRefreshSeconds,
    defaultDashboardView,
    defaultReportFormat,
    reportPreviewRows,
  }
}
