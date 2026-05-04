const DEFAULT_CORS_ORIGIN = 'http://localhost:5173'

export const CORS_ORIGINS = (process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return true
  if (CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin)) return true
  return isVercelOrigin(origin)
}

function isVercelOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}
