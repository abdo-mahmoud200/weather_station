const SESSION_KEY = 'wws.auth.session'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

const DEMO_USER = {
  id: 'USR-001',
  name: 'M. Alvarez',
  email: 'operator@wws.gov',
  role: 'Field Operations Supervisor',
  team: 'Remote Telemetry',
  shift: 'Tier 2 / Day Shift',
  phone: '+1 (555) 019-2241',
  location: 'Northern Operations Hub',
  clearance: 'GovOps-L2',
}

export async function loginWithCredentials({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedPassword = String(password || '')

  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
  })

  if (!response.ok) {
    let message = 'Invalid credentials. Use the assigned operator account.'
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const payload = await response.json()

  const session = {
    token: payload.token,
    user: {
      ...DEMO_USER,
      email: normalizedEmail,
      lastLoginAt: new Date().toISOString(),
    },
  }

  persistSession(session)
  return session
}

export function getAuthToken() {
  const session = getStoredSession()
  return session?.token || null
}

export function getStoredSession() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.user?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function persistSession(session) {
  if (typeof window === 'undefined') return session
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_KEY)
}

export function updateStoredUser(patch) {
  const current = getStoredSession()
  if (!current?.user) return null

  const next = {
    ...current,
    user: {
      ...current.user,
      ...patch,
    },
  }

  persistSession(next)
  return next
}

