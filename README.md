# Wilderness Weather Stations Monitoring System

React + Node.js monitoring system for new Egyptian wilderness weather stations in remote and under-covered areas. The frontend connects to a live Express/TypeScript backend that simulates station telemetry, stores readings in SQLite, emits Socket.io updates, and supports operational commands.

## Features

- Operations dashboard with live status cards, Egypt station map, Khamaseen watch, searchable station registry, status filtering, and realtime Socket.io refresh
- Station detail view with real-time metric cards, wind compass, instrument health, and 24-hour / 7-day charts
- Station control panel with typed confirmation for dangerous actions, remote instrument commands, firmware upload, progress tracking, and update history
- Reports page with preview generation and export to CSV, JSON, or PDF
- Alerts feed plus full activity log with filtering and acknowledgement workflows
- Live toasts for alerts, station status changes, Khamaseen events, station additions, and removals
- Toasts, skeleton loading states, empty states, anomaly highlighting, and responsive collapsible navigation

## Tech Stack

- React 19 + Vite
- React Router v6
- Tailwind CSS 3
- Recharts
- Lucide React
- Socket.io client
- Fetch API through a dedicated backend adapter
- Node.js + Express + TypeScript backend in `weather-backend/`
- better-sqlite3 SQLite storage

## Getting Started

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

Open `http://localhost:5173`.

The frontend expects the backend at `http://localhost:3001`. Copy `.env.example` to `.env` if you need a different API host.

Start the backend:

```bash
cd weather-backend
npm install
npm run dev
```

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
      EgyptStationMap.jsx
      MetricCard.jsx
      OperationsPanel.jsx
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
    socket.js
  hooks/
    useAutoRefresh.js
    useNowTicker.js
    useSocket.js
    useStations.js
    useWeatherData.js
  utils/
    formatters.js
    validators.js
```

## Backend

The backend lives in `weather-backend/` and exposes:

- `GET /api/stations`
- `GET /api/stations/:id`
- `GET /api/stations/:id/readings`
- `GET /api/stats/summary`
- `GET /api/alerts`
- `POST /api/stations/:id/command`
- Socket.io events such as `reading:new`, `alert:new`, `status:changed`, and `khamaseen:started`

Full backend details are in `weather-backend/README.md`.
