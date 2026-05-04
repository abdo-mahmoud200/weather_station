# Reconfigure Test Files

Sample JSON payloads for station reconfiguration testing.

Use them from the control page:

1. Open `http://localhost:5173/stations/EG-001/control`.
2. Click `Reconfigure`.
3. Choose a JSON file from the matching station folder.
4. Click `Apply`.

Each station folder has three profiles:

- `standard.json`: balanced telemetry.
- `storm-watch.json`: faster readings for severe weather monitoring.
- `low-power.json`: slower readings for battery conservation.

The frontend reads the JSON file and sends the `settings` object to:

```txt
POST /api/stations/:id/command
```

