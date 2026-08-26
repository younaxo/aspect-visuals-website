import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware, ownerOnly } from '../middleware/admin'
import {
  banUser,
  createFolder,
  createProduct,
  createSubscription,
  deleteFolder,
  deleteProduct,
  deleteSubscription,
  deleteUser,
  generateAdminKeys,
  getAdminLogs,
  getDashboardStats,
  getFolders,
  getProducts,
  getPurchaseHistory,
  getSubscriptions,
  getSystemSettings,
  getUserById,
  getUsers,
  refundPurchase,
  unbanUser,
  updateFolder,
  updateProduct,
  updateSubscription,
  updateSystemSettings,
  updateUserRole,
} from '../controllers/adminController'

const router = Router()
const guard = [authMiddleware, adminMiddleware] as const

router.get('/dashboard', ...guard, getDashboardStats)
router.get('/users', ...guard, getUsers)
router.get('/users/:id', ...guard, getUserById)
router.put('/users/:id/role', ...guard, updateUserRole)
router.post('/users/:id/ban', ...guard, banUser)
router.delete('/users/:id/ban', ...guard, unbanUser)
router.delete('/users/:id', ...guard, ownerOnly, deleteUser)

router.get('/subscriptions', ...guard, getSubscriptions)
router.post('/subscriptions', ...guard, createSubscription)
router.put('/subscriptions/:id', ...guard, updateSubscription)
router.delete('/subscriptions/:id', ...guard, deleteSubscription)

router.get('/products', ...guard, getProducts)
router.post('/products', ...guard, createProduct)
router.put('/products/:id', ...guard, updateProduct)
router.delete('/products/:id', ...guard, deleteProduct)

router.get('/folders', ...guard, getFolders)
router.post('/folders', ...guard, createFolder)
router.put('/folders/:id', ...guard, updateFolder)
router.delete('/folders/:id', ...guard, deleteFolder)

router.post('/keys/generate', ...guard, generateAdminKeys)

router.get('/purchases', ...guard, getPurchaseHistory)
router.post('/purchases/:id/refund', ...guard, refundPurchase)
router.get('/logs', ...guard, getAdminLogs)
router.get('/settings', ...guard, getSystemSettings)
router.put('/settings', ...guard, updateSystemSettings)

export default router
