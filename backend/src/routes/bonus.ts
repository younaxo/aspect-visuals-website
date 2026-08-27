import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import {
  claimDailyBonus,
  createBonus,
  deleteBonus,
  getDailyBonus,
  listBonus,
  redeemBonus,
  updateBonus,
} from '../controllers/bonusController'

const router = Router()

router.post('/bonus/redeem', authMiddleware, redeemBonus)
router.get('/bonus/daily', authMiddleware, getDailyBonus)
router.post('/bonus/daily/claim', authMiddleware, claimDailyBonus)
router.get('/admin/bonus', authMiddleware, adminMiddleware, listBonus)
router.post('/admin/bonus', authMiddleware, adminMiddleware, createBonus)
router.put('/admin/bonus/:id', authMiddleware, adminMiddleware, updateBonus)
router.delete('/admin/bonus/:id', authMiddleware, adminMiddleware, deleteBonus)

export default router
