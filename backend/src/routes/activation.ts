import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import {
  activateKey,
  checkKey,
  deleteKey,
  generateKeys,
  getBatchKeys,
  getKeys,
  getMyKeys,
} from '../controllers/activationController'

const router = Router()

router.post('/activation/activate', authMiddleware, activateKey)
router.post('/activation/check', checkKey)
router.get('/activation/keys', authMiddleware, getMyKeys)
router.post('/admin/keys/generate', authMiddleware, adminMiddleware, generateKeys)
router.get('/admin/keys', authMiddleware, adminMiddleware, getKeys)
router.get('/admin/keys/batch/:id', authMiddleware, adminMiddleware, getBatchKeys)
router.delete('/admin/keys/:id', authMiddleware, adminMiddleware, deleteKey)

export default router
