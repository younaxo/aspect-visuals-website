import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import {
  createNews,
  deleteNews,
  getNewsById,
  getPublishedNews,
  listAllNews,
  listPublishedNews,
  updateNews,
} from '../controllers/newsController'

const router = Router()
const guard = [authMiddleware, adminMiddleware] as const

// Публичные: сайт и лаунчер получают один и тот же список
router.get('/news', listPublishedNews)
router.get('/news/:slug', getPublishedNews)

// Административные: каждая операция проверяет роль на backend
router.get('/admin/news', ...guard, listAllNews)
router.get('/admin/news/:id', ...guard, getNewsById)
router.post('/admin/news', ...guard, createNews)
router.put('/admin/news/:id', ...guard, updateNews)
router.delete('/admin/news/:id', ...guard, deleteNews)

export default router
