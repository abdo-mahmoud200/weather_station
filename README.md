# Wilderness Weather Stations Monitoring Dashboard

A production-ready React frontend for a government monitoring system that tracks remote wilderness weather stations collecting temperature, pressure, wind, and rainfall telemetry every 5 minutes.

## Features

- Operations dashboard with live status cards, searchable station registry, status filtering, and auto-refresh every 30 seconds
- Station detail view with real-time metric cards, wind compass, instrument health, and 24-hour / 7-day charts
- Station control panel with typed confirmation for dangerous actions, remote instrument commands, firmware upload, progress tracking, and update history
- Reports page with preview generation and export to CSV, JSON, or PDF
- Alerts feed plus full activity log with filtering, acknowledgement, and resolution workflows
- Toasts, skeleton loading states, empty states, anomaly highlighting, and responsive collapsible navigation

## Tech Stack

- React 19 + Vite
- React Router v6
- Tailwind CSS 3
- Recharts
- Lucide React
- Fetch API through a dedicated `services` layer

## Getting Started

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

Open `http://localhost:5173`.

Routing uses `HashRouter`, so static deployments can open deep app views safely without server-side route rewrites.

## Project Structure

```text
src/
  components/
    common/
      Badge.jsx
      Button.jsx
      Card.jsx
      ConfirmDialog.jsx
      EmptyState.jsx
      Form.jsx
      LiveDot.jsx
      Modal.jsx
      ProgressBar.jsx
      Skeleton.jsx
      Toast.jsx
    dashboard/
      MetricCard.jsx
      StationCard.jsx
      StationList.jsx
      StatsBar.jsx
    station/
      Charts.jsx
      ControlPanel.jsx
      DetailView.jsx
      InstrumentsPanel.jsx
      StationHeader.jsx
      WindCompass.jsx
    layout/
      Navbar.jsx
      PageWrapper.jsx
      Sidebar.jsx
  pages/
    Alerts.jsx
    ControlPanel.jsx
    Dashboard.jsx
    Reports.jsx
    StationDetail.jsx
  services/
    api.js
    mockData.js
  hooks/
    useAutoRefresh.js
    useNowTicker.js
    useStations.js
    useWeatherData.js
  utils/
    formatters.js
    validators.js
```

## Mock Backend Behavior

The frontend currently runs against an in-memory mock service:

- station commands mutate station state
- remote commands are logged into the activity feed
- firmware uploads update version history and station metadata
- alerts and activity remain available through the same service interface that a real backend will use later

This keeps the UI realistic now while preserving a clean migration path to real APIs.

## Switching to a Real Backend

All data access is centralized in `src/services/api.js`.

1. Set `USE_MOCK = false` in `src/services/api.js`
2. Provide `VITE_API_BASE` in your environment
3. Implement matching backend endpoints for stations, alerts, activity, reports, commands, and software uploads

No page-level or component-level API calls need to change.
