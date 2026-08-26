import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getMessages, getOnline, getUnread, markRead } from '../controllers/chatController'

const router = Router()

router.get('/messages/:channel/:before', authMiddleware, getMessages)
router.get('/messages/:channel', authMiddleware, getMessages)
router.get('/online', authMiddleware, getOnline)
router.get('/unread', authMiddleware, getUnread)
router.post('/read', authMiddleware, markRead)

export default router
