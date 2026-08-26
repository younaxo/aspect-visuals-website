import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import {
  activateTestSubscription,
  applyPromo,
  cancelSubscription,
  checkTestSubscription,
  confirmPurchase,
  createPurchase,
  getProducts,
  getSubscriptionById,
  getSubscriptions,
  getUserPurchases,
  getUserSubscriptions,
  mockComplete,
} from '../controllers/shopController'

const router = Router()
const purchaseLimiter = rateLimit('shop-purchase', 30, 15 * 60 * 1000)

router.get('/subscriptions', getSubscriptions)
router.get('/products', getProducts)
router.get('/subscriptions/:id', getSubscriptionById)
router.post('/apply-promo', authMiddleware, applyPromo)
router.post('/purchase', authMiddleware, purchaseLimiter, createPurchase)
router.post('/webhook', confirmPurchase)
router.get('/webhook', confirmPurchase)
router.post('/mock-complete/:orderId', authMiddleware, mockComplete)
router.get('/user/subscriptions', authMiddleware, getUserSubscriptions)
router.get('/user/purchases', authMiddleware, getUserPurchases)
router.get('/subscription/test', authMiddleware, checkTestSubscription)
router.post('/subscription/test', authMiddleware, activateTestSubscription)
router.post('/subscription/cancel/:id', authMiddleware, cancelSubscription)

export default router
