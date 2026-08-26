import { Router } from 'express'
import {
  discordAuthUrl,
  discordCallback,
  discordCallbackRedirect,
  getMe,
  logout,
  refresh,
} from '../controllers/authController'
import { authMiddleware, optionalAuth } from '../middleware/auth'

const router = Router()

router.get('/discord', discordAuthUrl)
router.post('/discord', discordAuthUrl)
router.get('/discord/callback', discordCallbackRedirect)
router.post('/discord/callback', discordCallback)
router.get('/me', authMiddleware, getMe)
router.post('/refresh', refresh)
router.post('/logout', optionalAuth, logout)

export default router
