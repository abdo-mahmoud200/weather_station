import { Router, type NextFunction, type Request, type Response } from 'express'

const DEMO_EMAIL = (process.env.DEMO_EMAIL || 'operator@wws.gov').toLowerCase()
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Wws123!'
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'wws-demo-token'
const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true'

const router = Router()

router.post('/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')

  if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    res.status(401).json({ error: 'Invalid credentials.' })
    return
  }

  res.json({
    token: AUTH_TOKEN,
    user: {
      email,
      role: 'operator',
    },
  })
})

router.get('/verify', requireAuth, (_req, res) => {
  res.json({ ok: true })
})

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (AUTH_DISABLED) {
    next()
    return
  }

  const header = req.headers.authorization || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match || match[1] !== AUTH_TOKEN) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }

  next()
}

export default router
