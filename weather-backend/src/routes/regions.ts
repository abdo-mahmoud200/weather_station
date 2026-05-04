import { Router } from 'express'
import { CLIMATE_PROFILES, VALID_REGIONS } from '../models/Station'

const router = Router()

router.get('/', (_req, res) => {
  res.json(
    VALID_REGIONS.map((region) => ({
      region,
      climateProfile: CLIMATE_PROFILES[region],
    })),
  )
})

export default router
