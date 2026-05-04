import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { db } from '../config/database'
import { isValidRegion, normalizeStationStatus, type EgyptRegion, type StationRow } from '../models/Station'
import { emitToAll } from '../websocket/wsServer'
import { logActivity } from '../services/activityLog'
import { getStationById, toStationWithLatest } from '../services/stationView'
import { handleStationCommand, removeStationFromSimulator, syncStationInSimulator } from '../services/simulator'

const router = Router()

const ALLOWED_EXTENSIONS = ['.bin', '.img', '.tar', '.tgz', '.zip', '.pkg']

const softwareUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const lower = file.originalname.toLowerCase()
    if (ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      cb(null, true)
      return
    }
    cb(new Error('Invalid software bundle extension.'))
  },
})

router.get('/', (req, res) => {
  const filters = ['active = 1']
  const params: Array<string | number> = []

  if (typeof req.query.region === 'string' && req.query.region.trim()) {
    filters.push('region = ?')
    params.push(req.query.region)
  }

  if (typeof req.query.status === 'string' && req.query.status.trim()) {
    filters.push('status = ?')
    params.push(req.query.status.toUpperCase())
  }

  const stations = db
    .prepare(
      `SELECT * FROM stations
       WHERE ${filters.join(' AND ')}
       ORDER BY id ASC`,
    )
    .all(...params) as StationRow[]

  res.json(stations.map(toStationWithLatest))
})

router.get('/registry', (_req, res) => {
  const stations = db.prepare('SELECT * FROM stations ORDER BY active DESC, id ASC').all() as StationRow[]
  res.json(stations.map(toStationWithLatest))
})

router.get('/:id', (req, res) => {
  const station = getStationById(req.params.id)
  if (!station) {
    res.status(404).json({ error: `Station not found: ${req.params.id}` })
    return
  }

  res.json(station)
})

router.post('/', (req, res) => {
  const parsed = parseStationPayload(req.body, { requireName: true })
  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  const id = nextStationId()
  const timestamp = new Date().toISOString()
  const signal = initialSignalForStation(id)
  const initialStatus = normalizeStationStatus(
    String(req.body?.initialState ?? req.body?.initial_state ?? 'RUNNING'),
  )

  db.prepare(
    `INSERT INTO stations (
      id, name, name_ar, region, lat, lng, elevation, status, battery, signal, installed_at, active, software_version, notes
    ) VALUES (
      @id, @name, @name_ar, @region, @lat, @lng, @elevation, @status, 100, @signal, @installed_at, 1, '1.0.0', @notes
    )`,
  ).run({
    id,
    ...parsed.value,
    status: initialStatus,
    signal,
    installed_at: timestamp,
  })

  const station = getStationById(id)
  if (!station) {
    res.status(500).json({ error: 'Station was created but could not be loaded.' })
    return
  }

  syncStationInSimulator(station)
  logActivity({
    stationId: station.id,
    stationName: station.name,
    type: 'system.station.registered',
    actor: 'operator',
    message: `${station.id} registered as a new Egyptian wilderness weather station.`,
  })
  emitToAll('station:added', { station })
  emitToAll('stations:updated', { timestamp })

  res.status(201).json(station)
})

router.put('/:id', (req, res) => {
  const current = getStationById(req.params.id)
  if (!current) {
    res.status(404).json({ error: `Station not found: ${req.params.id}` })
    return
  }

  const parsed = parseStationPayload(
    {
      name: req.body.name ?? current.name,
      name_ar: req.body.name_ar ?? current.name_ar,
      region: req.body.region ?? current.region,
      lat: req.body.lat ?? current.lat,
      lng: req.body.lng ?? req.body.lon ?? current.lng,
      elevation: req.body.elevation ?? current.elevation,
      notes: req.body.notes ?? current.notes,
    },
    { requireName: true },
  )

  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  db.prepare(
    `UPDATE stations
     SET name = @name,
         name_ar = @name_ar,
         region = @region,
         lat = @lat,
         lng = @lng,
         elevation = @elevation,
         notes = @notes
     WHERE id = @id`,
  ).run({
    id: req.params.id,
    ...parsed.value,
  })

  const station = getStationById(req.params.id)
  if (!station) {
    res.status(500).json({ error: 'Station was updated but could not be loaded.' })
    return
  }

  syncStationInSimulator(station)
  logActivity({
    stationId: station.id,
    stationName: station.name,
    type: 'system.station.updated',
    actor: 'operator',
    message: `${station.id} station metadata updated.`,
  })
  emitToAll('station:updated', { station })
  emitToAll('stations:updated', { timestamp: new Date().toISOString() })

  res.json(station)
})

router.delete('/:id', (req, res) => {
  const current = getStationById(req.params.id)
  if (!current) {
    res.status(404).json({ error: `Station not found: ${req.params.id}` })
    return
  }

  const decommissionedAt = new Date().toISOString()
  db.prepare(
    'UPDATE stations SET active = 0, status = ?, decommissioned_at = ? WHERE id = ?',
  ).run('SHUTDOWN', decommissionedAt, req.params.id)
  removeStationFromSimulator(req.params.id)

  logActivity({
    stationId: current.id,
    stationName: current.name,
    type: 'system.station.decommissioned',
    actor: 'operator',
    message: `${current.id} removed from active monitoring and archived.`,
  })
  emitToAll('station:removed', { stationId: req.params.id })
  emitToAll('stations:updated', { timestamp: new Date().toISOString() })

  res.json({ ok: true, stationId: req.params.id })
})

router.post('/:id/command', commandHandler)
router.post('/:id/commands', commandHandler)

router.post('/:id/software', softwareUpload.single('file'), (req, res) => {
  try {
    const uploadedFile = req.file as Express.Multer.File | undefined
    const fileName =
      uploadedFile?.originalname ||
      (typeof req.body?.fileName === 'string' ? req.body.fileName : '') ||
      (typeof req.headers['x-file-name'] === 'string' ? req.headers['x-file-name'] : '') ||
      'firmware.bin'

    const result = handleStationCommand(req.params.id, {
      command: 'software_update',
      fileName,
    })
    res.json({
      ...result,
      bytesUploaded: uploadedFile?.size ?? 0,
    })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Software update failed.' })
  }
})

function commandHandler(req: Request, res: Response): void {
  try {
    const result = handleStationCommand(req.params.id, req.body)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Command failed.' })
  }
}

function parseStationPayload(
  body: Record<string, unknown>,
  options: { requireName: boolean },
):
  | {
      value: {
        name: string
        name_ar: string
        region: EgyptRegion
        lat: number
        lng: number
        elevation: number
        notes: string
      }
    }
  | { error: string } {
  const name = String(body.name ?? '').trim()
  const nameAr = String(body.name_ar ?? body.nameAr ?? name).trim()
  const region = String(body.region ?? '').trim()
  const lat = Number(body.lat)
  const lng = Number(body.lng ?? body.lon)
  const elevation = body.elevation === undefined || body.elevation === '' ? 0 : Number(body.elevation)
  const notes = String(body.notes ?? '').trim()

  if (options.requireName && !name) return { error: 'name is required.' }
  if (!nameAr) return { error: 'name_ar is required.' }
  if (!isValidRegion(region)) return { error: `region must be one of: ${['Western Desert', 'Eastern Desert', 'South Sinai Mtn', 'South Sinai', 'Sinai Coast', 'Red Sea Coast', 'Upper Egypt'].join(', ')}` }
  if (!Number.isFinite(lat) || lat < 20 || lat > 32) return { error: 'lat must be between 20 and 32.' }
  if (!Number.isFinite(lng) || lng < 24 || lng > 38) return { error: 'lng must be between 24 and 38.' }
  if (!Number.isFinite(elevation)) return { error: 'elevation must be a valid number.' }

  return {
    value: {
      name,
      name_ar: nameAr,
      region,
      lat,
      lng,
      elevation: Math.round(elevation),
      notes,
    },
  }
}

function nextStationId(): string {
  const rows = db.prepare("SELECT id FROM stations WHERE id LIKE 'EG-%'").all() as Array<{ id: string }>
  const max = rows.reduce((highest, row) => {
    const value = Number.parseInt(row.id.replace('EG-', ''), 10)
    return Number.isFinite(value) ? Math.max(highest, value) : highest
  }, 0)
  return `EG-${String(max + 1).padStart(3, '0')}`
}

function initialSignalForStation(id: string): number {
  if (id === 'EG-003' || id === 'EG-014') return 62
  if (id === 'EG-007' || id === 'EG-008') return 68
  return 88
}

export default router
