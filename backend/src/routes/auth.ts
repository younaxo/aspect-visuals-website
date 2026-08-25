import { Router } from 'express'
import { discordAuth, getMe, logout, refresh } from '../controllers/authController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.post('/discord', discordAuth)
router.get('/me', authMiddleware, getMe)
router.post('/refresh', refresh)
router.post('/logout', logout)

export default router
