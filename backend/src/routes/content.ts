import { Router } from 'express'
import { getSiteContent } from '../controllers/contentController'

const router = Router()
router.get('/', getSiteContent)
export default router
