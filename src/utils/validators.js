/**
 * Small validation helpers used in forms and control actions.
 */

export function isNonEmpty(value) {
  return value !== null && value !== undefined && String(value).trim().length > 0
}

export function isValidDateRange(from, to) {
  if (!from || !to) return false
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return a <= b
}

export function isValidCommand(cmd) {
  if (!isNonEmpty(cmd)) return false
  // Restrict remote commands to a safe pattern: alphanumerics, dots,
  // dashes, underscores, equals, spaces.
  return /^[A-Za-z0-9._\-=\s]{1,120}$/.test(cmd.trim())
}

export function isValidSoftwareFile(file) {
  if (!file) return false
  const maxSize = 50 * 1024 * 1024
  const name = file.name?.toLowerCase() || ''
  const okExt = /\.(bin|img|tar|tgz|zip|pkg)$/.test(name)
  return file.size > 0 && file.size <= maxSize && okExt
}

export function requireTypedPhrase(input, phrase) {
  return typeof input === 'string' && input === phrase
}
