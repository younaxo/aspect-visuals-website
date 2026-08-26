import { Router } from 'express'
import {
  checkDiscordLink,
  discordAuthUrl,
  discordCallback,
  discordCallbackRedirect,
  forgotPassword,
  getMe,
  linkDiscord,
  login,
  logout,
  refresh,
  register,
  resetPassword,
  unlinkDiscord,
  verifyEmail,
} from '../controllers/authController'
import { authMiddleware, optionalAuth } from '../middleware/auth'
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimit'

const router = Router()

router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword)
router.post('/reset-password', resetPasswordLimiter, resetPassword)
router.get('/verify-email', verifyEmail)

router.get('/discord', optionalAuth, discordAuthUrl)
router.post('/discord', optionalAuth, discordAuthUrl)
router.get('/discord/callback', discordCallbackRedirect)
router.post('/discord/callback', discordCallback)

router.post('/link-discord', authMiddleware, linkDiscord)
router.post('/unlink-discord', authMiddleware, unlinkDiscord)
router.get('/discord-status', authMiddleware, checkDiscordLink)

router.get('/me', authMiddleware, getMe)
router.post('/refresh', refresh)
router.post('/logout', optionalAuth, logout)

export default router
