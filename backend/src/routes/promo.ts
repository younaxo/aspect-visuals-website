import { Router } from 'express'
import { authMiddleware, optionalAuth } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import {
  applyPromoCode,
  createPromoCode,
  deletePromoCode,
  getAllPromoCodes,
  getPromoCodeInfo,
  removePromoCode,
  updatePromoCode,
  validatePromoCode,
} from '../controllers/promoController'

const router = Router()

router.post('/promo/validate', optionalAuth, validatePromoCode)
router.post('/promo/apply', authMiddleware, applyPromoCode)
router.delete('/promo/remove', authMiddleware, removePromoCode)
router.get('/promo/:code', optionalAuth, getPromoCodeInfo)
router.post('/admin/promo', authMiddleware, adminMiddleware, createPromoCode)
router.put('/admin/promo/:id', authMiddleware, adminMiddleware, updatePromoCode)
router.delete('/admin/promo/:id', authMiddleware, adminMiddleware, deletePromoCode)
router.get('/admin/promo', authMiddleware, adminMiddleware, getAllPromoCodes)

export default router
