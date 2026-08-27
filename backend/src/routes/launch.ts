import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import {
  clientManifest,
  closeGameSession,
  createGameSession,
  createLaunchToken,
  heartbeatGameSession,
  launchPublicKey,
} from '../controllers/launchController'

const router = Router()

// Токен живёт секунды, поэтому частые запросы допустимы, но не безграничные
const launchLimiter = rateLimit('launch-token', 30, 10 * 60 * 1000)
const sessionLimiter = rateLimit('game-session', 60, 10 * 60 * 1000)

router.post('/launch/token', authMiddleware, launchLimiter, createLaunchToken)
router.get('/launch/public-key', launchPublicKey)

router.post('/game/session', sessionLimiter, createGameSession)
router.post('/game/session/:id/heartbeat', sessionLimiter, heartbeatGameSession)
router.delete('/game/session/:id', authMiddleware, closeGameSession)

router.get('/client/manifest', clientManifest)

export default router
