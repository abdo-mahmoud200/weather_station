/**
 * Formatting helpers for the UI layer. Pure functions, no side effects.
 */

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return Number(value).toFixed(digits)
}

export function formatMetric(value, unit, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return `${Number(value).toFixed(digits)} ${normalizeUnit(unit)}`.trim()
}

export function formatDateTime(input) {
  const date = toDate(input)
  if (!date) return '--'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatTime(input) {
  const date = toDate(input)
  if (!date) return '--'
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatShortDate(input) {
  const date = toDate(input)
  if (!date) return '--'
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

export function timeAgo(input) {
  const date = toDate(input)
  if (!date) return 'never'
  const diff = (Date.now() - date.getTime()) / 1000

  if (diff < 10) return 'just now'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`

  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.floor(months / 12)}y ago`
}

export function formatCoordinates(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return '--'
  const northSouth = lat >= 0 ? 'N' : 'S'
  const eastWest = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)} deg ${northSouth}, ${Math.abs(lon).toFixed(4)} deg ${eastWest}`
}

export function degreesToCompass(deg) {
  if (typeof deg !== 'number') return '--'
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ]
  return directions[Math.round(((deg % 360) / 22.5)) % 16]
}

export function statusToTone(status) {
  if (!status) return 'neutral'
  const normalized = String(status).toLowerCase()
  if (['ok', 'running', 'resolved', 'success', 'online'].includes(normalized)) return 'success'
  if (['warning', 'acknowledged', 'powersave', 'info'].includes(normalized)) return 'warning'
  if (['failed', 'shutdown', 'critical', 'new', 'offline'].includes(normalized)) return 'danger'
  return 'info'
}

export function isAnomalous(metricKey, value) {
  if (value === null || value === undefined) return false
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return false

  switch (metricKey) {
    case 'airTemperature':
      return numericValue < -25 || numericValue > 45
    case 'groundTemperature':
      return numericValue < -25 || numericValue > 50
    case 'pressure':
      return numericValue < 970 || numericValue > 1050
    case 'windSpeed':
      return numericValue > 25
    case 'battery':
      return numericValue < 20
    default:
      return false
  }
}

export function toCSV(rows) {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escapeValue = (value) => {
    if (value === null || value === undefined) return ''
    const stringValue = String(value)
    if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`
    return stringValue
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeValue(row[header])).join(','))
  }

  return lines.join('\n')
}

export function toReportPdf(rows, meta = {}) {
  const columns = Object.keys(rows[0] || { timestamp: '', stationId: '', stationName: '' })
  const sampleRows = rows.slice(0, 180)
  const widths = columns.map((column) =>
    Math.min(
      18,
      Math.max(
        column.length,
        ...sampleRows.map((row) => sanitizePdfText(formatPdfCell(column, row[column])).length),
      ),
    ),
  )

  const lines = [
    'Wilderness Weather Station Report',
    `Generated: ${new Date().toISOString().replace('T', ' ').replace('Z', ' UTC')}`,
    `Range: ${sanitizePdfText(meta.from || '')} -> ${sanitizePdfText(meta.to || '')}`,
    `Stations: ${sanitizePdfText((meta.selectedStations || []).join(', '))}`,
    `Data types: ${sanitizePdfText((meta.types || []).join(', '))}`,
    '',
    columns.map((column, index) => padText(column, widths[index])).join(' | '),
    widths.map((width) => '-'.repeat(width)).join('-+-'),
  ]

  for (const row of sampleRows) {
    lines.push(
      columns
        .map((column, index) => padText(formatPdfCell(column, row[column]), widths[index]))
        .join(' | '),
    )
  }

  if (rows.length > sampleRows.length) {
    lines.push('')
    lines.push(`Additional rows omitted from PDF export: ${rows.length - sampleRows.length}`)
  }

  return buildPdfBlob(chunk(lines, 46))
}

export function downloadFile(filename, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatPdfCell(column, value) {
  if (column === 'timestamp') {
    return new Date(value).toISOString().replace('T', ' ').replace('Z', ' UTC')
  }
  return sanitizePdfText(value ?? '')
}

function sanitizePdfText(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
}

function padText(value, width) {
  const normalized = sanitizePdfText(value)
  if (normalized.length >= width) return normalized.slice(0, width)
  return normalized.padEnd(width, ' ')
}

function chunk(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function buildPdfBlob(pages) {
  const objects = []
  const addObject = (content) => {
    objects.push(content)
    return objects.length
  }

  const fontRef = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>')
  const contentRefs = pages.map((page) => {
    const stream = buildPageStream(page)
    return addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })
  const pageRefs = contentRefs.map(() => addObject(''))
  const pagesRef = addObject(
    `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`,
  )

  pageRefs.forEach((pageRef, index) => {
    objects[pageRef - 1] =
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${fontRef} 0 R >> >> /Contents ${contentRefs[index]} 0 R >>`
  })

  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`)

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function buildPageStream(lines) {
  const commands = ['BT', '/F1 10 Tf', '14 TL', '40 760 Td']

  lines.forEach((line, index) => {
    if (index > 0) commands.push('T*')
    commands.push(`(${escapePdfText(line)}) Tj`)
  })

  commands.push('ET')
  return commands.join('\n')
}

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function normalizeUnit(unit) {
  const text = String(unit ?? '').toLowerCase()
  if (!text) return ''
  if (text.includes('m/s')) return 'm/s'
  if (text.includes('hpa')) return 'hPa'
  if (text.includes('mm')) return 'mm'
  if (text.includes('c')) return 'deg C'
  if (text.includes('deg') || text.includes('°')) return 'deg'
  return String(unit)
}

function toDate(input) {
  if (input === null || input === undefined || input === '') return null
  const date = input instanceof Date ? input : new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}
