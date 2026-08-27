import { Router } from 'express'
import { rateLimit } from '../middleware/rateLimit'
import {
  modFile,
  resourcePackFile,
  searchMods,
  searchResourcePacks,
} from '../controllers/catalogController'

const router = Router()

// Внешние каталоги имеют свои лимиты, поэтому ограничиваем и свой трафик
const catalogLimiter = rateLimit('catalog', 60, 5 * 60 * 1000)

router.get('/catalog/mods', catalogLimiter, searchMods)
router.get('/catalog/resourcepacks', catalogLimiter, searchResourcePacks)
router.get('/catalog/mods/:source/:id/file', catalogLimiter, modFile)
router.get('/catalog/resourcepacks/:source/:id/file', catalogLimiter, resourcePackFile)

export default router
