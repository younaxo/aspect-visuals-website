import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { clientSessionMiddleware, optionalClientSession } from '../middleware/clientSession'
import { rateLimit } from '../middleware/rateLimit'
import {
  approveDeviceRequest,
  clientProfile,
  denyDeviceRequest,
  exchangeDeviceToken,
  listSessions,
  logoutClient,
  readDeviceRequest,
  refreshSession,
  requestDeviceCode,
  revokeSession,
} from '../controllers/clientController'

const router = Router()

// Выдача кодов — самая интересная для перебора точка, лимит жёсткий
const deviceLimiter = rateLimit('client-device', 10, 15 * 60 * 1000)
// Опрос идёт раз в 5 секунд на код, поэтому запас нужен, но не бесконечный
const pollLimiter = rateLimit('client-poll', 240, 15 * 60 * 1000)
// Подбор восьмизначного кода через страницу подтверждения должен быть непрактичным
const approveLimiter = rateLimit('client-approve', 20, 15 * 60 * 1000)
const profileLimiter = rateLimit('client-profile', 120, 15 * 60 * 1000)

router.post('/auth/device', deviceLimiter, requestDeviceCode)
router.post('/auth/token', pollLimiter, exchangeDeviceToken)

router.get('/auth/device/:code', authMiddleware, approveLimiter, readDeviceRequest)
router.post('/auth/device/:code/approve', authMiddleware, approveLimiter, approveDeviceRequest)
router.post('/auth/device/:code/deny', authMiddleware, approveLimiter, denyDeviceRequest)

router.get('/profile', clientSessionMiddleware, profileLimiter, clientProfile)
router.post('/session/refresh', clientSessionMiddleware, profileLimiter, refreshSession)
router.delete('/session', clientSessionMiddleware, logoutClient)

router.get('/sessions', authMiddleware, optionalClientSession, listSessions)
router.delete('/sessions/:id', authMiddleware, revokeSession)

export default router
