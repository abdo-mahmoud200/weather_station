# Wilderness Weather Stations Backend

Node.js + Express + TypeScript backend for monitoring new Egyptian wilderness weather stations in remote and under-covered regions.

The backend simulates live station telemetry, stores readings in SQLite, generates Arabic alerts, broadcasts Socket.io events, and supports operational commands such as shutdown, restart, power-save, reconfiguration, remote control, and software update.

## What Phase 1 Does

- Creates a standalone backend on `http://localhost:3001`.
- Seeds 15 Egyptian wilderness stations if the database is empty.
- Generates one reading per active, non-shutdown station every 5 minutes (300 seconds).
- Stores station metadata, readings, alerts, activity events, and software updates in SQLite.
- Simulates realistic Egyptian region climate profiles.
- Simulates Khamaseen events in March, April, and May for Western/Eastern Desert stations.
- Simulates battery solar charging and night drain.
- Cycles station status through `RUNNING -> COLLECTING -> TRANSMITTING -> RUNNING`.
- Supports station commands through REST.
- Emits live updates through Socket.io.

## Install and Run

```bash
cd weather-backend
npm install
npm run dev
```

The server runs on:

```txt
http://localhost:3001
```

Optional environment file:

```bash
cp .env.example .env
```

Health check:

```bash
curl http://localhost:3001/api/health
```

Example response:

```json
{
  "ok": true,
  "service": "wilderness-weather-backend",
  "country": "Egypt",
  "timestamp": "2026-04-26T12:00:00.000Z"
}
```

## Seeded Egyptian Stations

| ID | Arabic | English | Region |
| --- | --- | --- | --- |
| EG-001 | واحة سيوة | Siwa Oasis | Western Desert |
| EG-002 | الفرافرة | Farafra | Western Desert |
| EG-003 | شرق العوينات | Shark El-Ouinat | Western Desert |
| EG-004 | وادي الريان | Wadi El-Rayan | Western Desert |
| EG-005 | وادي الجمال | Wadi El-Gamal | Eastern Desert |
| EG-006 | وادي حمامات | Wadi Hammamat | Eastern Desert |
| EG-007 | جبل الشايب | Jabal El-Shayeb | Eastern Desert |
| EG-008 | جبل موسى | Jabal Musa | South Sinai Mtn |
| EG-009 | وادي فيران | Wadi Feiran | South Sinai |
| EG-010 | نبق | Nabq | Sinai Coast |
| EG-011 | شلاتين | Shalatin | Red Sea Coast |
| EG-012 | حلايب | Halayeb | Red Sea Coast |
| EG-013 | أبو سمبل | Abu Simbel | Upper Egypt |
| EG-014 | وادي حلفا | Wadi Halfa Area | Upper Egypt |
| EG-015 | الداخلة | Dakhla | Western Desert |

## Egyptian Regions

```txt
Western Desert
Eastern Desert
South Sinai Mtn
South Sinai
Sinai Coast
Red Sea Coast
Upper Egypt
```

Get region climate profiles:

```bash
curl http://localhost:3001/api/regions
```

## API Endpoints

### Stations

Get all active stations:

```bash
curl "http://localhost:3001/api/stations"
```

Filter stations:

```bash
curl "http://localhost:3001/api/stations?region=Western%20Desert&status=RUNNING"
```

Example station response:

```json
{
  "id": "EG-001",
  "name": "Siwa Oasis",
  "name_ar": "واحة سيوة",
  "region": "Western Desert",
  "lat": 29.2037,
  "lng": 25.52,
  "elevation": 18,
  "status": "RUNNING",
  "battery": 99.97,
  "signal": 87.4,
  "installed_at": "2026-04-26T12:00:00.000Z",
  "active": 1,
  "software_version": "1.0.0",
  "notes": "New Egyptian wilderness weather station deployed to improve remote climate coverage.",
  "latest_reading": {
    "id": 1,
    "station_id": "EG-001",
    "air_temp": 33.1,
    "ground_temp": 36.4,
    "wind_speed": 8.3,
    "wind_direction": "NW",
    "pressure": 1009.8,
    "rainfall": 0,
    "sunshine": 92.2,
    "humidity": 11.8,
    "battery": 99.97,
    "signal": 87.4,
    "timestamp": "2026-04-26T12:00:00.000Z"
  },
  "active_alerts_count": 0,
  "online": true
}
```

Get one station:

```bash
curl http://localhost:3001/api/stations/EG-001
```

Get registry including inactive stations:

```bash
curl http://localhost:3001/api/stations/registry
```

Add a new station. The ID is assigned automatically as the next `EG-XXX`.

```bash
curl -X POST http://localhost:3001/api/stations \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Qattara Depression\",\"name_ar\":\"منخفض القطارة\",\"region\":\"Western Desert\",\"lat\":30.0,\"lng\":27.5,\"elevation\":-50}"
```

Update station metadata:

```bash
curl -X PUT http://localhost:3001/api/stations/EG-016 \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Qattara Field Station\",\"elevation\":-60}"
```

Soft delete a station:

```bash
curl -X DELETE http://localhost:3001/api/stations/EG-016
```

### Station Commands

Commands are accepted on both routes:

```txt
POST /api/stations/:id/command
POST /api/stations/:id/commands
```

Shutdown:

```bash
curl -X POST http://localhost:3001/api/stations/EG-001/command \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"shutdown\"}"
```

Restart:

```bash
curl -X POST http://localhost:3001/api/stations/EG-001/command \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"restart\"}"
```

Toggle power-save:

```bash
curl -X POST http://localhost:3001/api/stations/EG-001/command \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"powersave\",\"enabled\":true}"
```

Reconfigure:

```bash
curl -X POST http://localhost:3001/api/stations/EG-001/command \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"reconfigure\",\"settings\":{\"readingIntervalSeconds\":300,\"alertProfile\":\"desert-extreme\"}}"
```

Remote control:

```bash
curl -X POST http://localhost:3001/api/stations/EG-001/command \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"remote\",\"instrument\":\"anemometer\",\"action\":\"calibrate\"}"
```

Reset battery:

```bash
curl -X POST http://localhost:3001/api/stations/EG-001/command \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"reset_battery\"}"
```

Software update:

```bash
curl -X POST http://localhost:3001/api/stations/EG-001/software \
  -H "Content-Type: application/json" \
  -d "{\"fileName\":\"wws-firmware-1.0.1.bin\"}"
```

Example command response:

```json
{
  "ok": true,
  "command": "remote",
  "stationId": "EG-001",
  "message": "Remote command executed.",
  "response": "[2026-04-26T12:00:00.000Z] -> anemometer.calibrate\n[2026-04-26T12:00:00.000Z] <- OK: wind=8.3 m/s direction=NW",
  "station": {
    "id": "EG-001",
    "status": "CONTROLLED"
  },
  "timestamp": "2026-04-26T12:00:00.000Z"
}
```

### Readings

Get recent readings:

```bash
curl "http://localhost:3001/api/stations/EG-001/readings?limit=50"
```

Filter readings by time:

```bash
curl "http://localhost:3001/api/stations/EG-001/readings?from=2026-04-26T00:00:00.000Z&to=2026-04-26T23:59:59.999Z"
```

Get chart series:

```bash
curl "http://localhost:3001/api/stations/EG-001/series?metric=airTemperature&hours=24"
```

Valid series metrics:

```txt
airTemperature
groundTemperature
pressure
windSpeed
rainfall
sunshine
humidity
battery
signal
```

Get 7-day rainfall:

```bash
curl http://localhost:3001/api/stations/EG-001/rainfall
```

Get software update history:

```bash
curl http://localhost:3001/api/stations/EG-001/updates
```

### Alerts

Get all alerts:

```bash
curl http://localhost:3001/api/alerts
```

Filter alerts:

```bash
curl "http://localhost:3001/api/alerts?unacknowledged=true&station_id=EG-001&severity=critical"
```

Acknowledge an alert:

```bash
curl -X PATCH http://localhost:3001/api/alerts/ALERT_ID/acknowledge
```

Clear acknowledged alerts:

```bash
curl -X DELETE http://localhost:3001/api/alerts/acknowledged
```

### Stats

Get summary:

```bash
curl http://localhost:3001/api/stats/summary
```

Example summary:

```json
{
  "online": 15,
  "offline": 0,
  "warnings": 1,
  "shutdown": 0,
  "collecting": 4,
  "transmitting": 3,
  "powersave": 0,
  "configuring": 0,
  "controlled": 0,
  "avgTemp": 31.6,
  "maxTemp": { "value": 42.4, "stationName": "Abu Simbel" },
  "minTemp": { "value": 12.1, "stationName": "Jabal Musa" },
  "totalAlerts": 3,
  "unacknowledgedAlerts": 3,
  "khamaseenActive": 1,
  "khamaseenStations": [
    {
      "stationId": "EG-003",
      "stationName": "Shark El-Ouinat",
      "region": "Western Desert",
      "duration": 3,
      "remainingTicks": 2
    }
  ],
  "regionSummary": [
    { "region": "Western Desert", "stationCount": 5, "avgTemp": 33.2, "avgBattery": 99.9 }
  ]
}
```

### Activity

Get activity log:

```bash
curl http://localhost:3001/api/activity
```

Filter activity:

```bash
curl "http://localhost:3001/api/activity?station_id=EG-001&type=command.restart"
```

## WebSocket Events

Socket.io server URL:

```txt
http://localhost:3001
```

Server emits:

```txt
reading:new        { stationId, reading }
status:changed     { stationId, oldStatus, newStatus }
alert:new          { alert }
station:added      { station }
station:removed    { stationId }
station:updated    { station }
stations:updated   { timestamp }
khamaseen:started  { stationId, stationName, duration }
khamaseen:ended    { stationId }
```

Client emits:

```txt
subscribe:station    stationId
unsubscribe:station  stationId
```

Minimal client example:

```js
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')
socket.emit('subscribe:station', 'EG-001')
socket.on('reading:new', (payload) => console.log(payload))
socket.on('alert:new', (payload) => console.log(payload))
```

## Manual Test Flow

1. Start the backend.
2. Call `/api/health` to confirm the server is alive.
3. Call `/api/stations` and verify 15 active Egyptian stations.
4. Wait 5 minutes and call `/api/stations/EG-001/readings?limit=5`.
5. Call `/api/stats/summary` and verify averages and status counts.
6. Send a shutdown command to `EG-001`.
7. Call `/api/stations/EG-001` and verify `status` is `SHUTDOWN`.
8. Call `/api/alerts?unacknowledged=true&station_id=EG-001` and verify a station shutdown alert exists.
9. Send a restart command to `EG-001`.
10. Call `/api/activity?station_id=EG-001` and verify command events were logged.

## Notes

- SQLite database file is created at `database/weather.db`.
- The database is seeded only when `stations` is empty.
- The simulator keeps at most 300 readings per station, about 25 hours at 5-minute intervals.
- The alert engine keeps at most 200 alerts, deleting acknowledged alerts first.
- CORS allows the Vite frontend origin `http://localhost:5173`.
