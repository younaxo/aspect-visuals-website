import { Router } from 'express'
import {
  getProfile,
  getSettings,
  updateAvatar,
  updateBanner,
  updateProfile,
  updateSettings,
  uploadFile,
} from '../controllers/profileController'
import { authMiddleware } from '../middleware/auth'
import { handleUploadError, uploadImage } from '../middleware/upload'

const router = Router()

router.get('/profile', authMiddleware, getProfile)
router.put('/profile', authMiddleware, updateProfile)
router.put('/profile/avatar', authMiddleware, updateAvatar)
router.put('/profile/banner', authMiddleware, updateBanner)
router.post(
  '/profile/upload',
  authMiddleware,
  (req, res, next) => {
    uploadImage.single('file')(req, res, (err) => {
      if (err) {
        handleUploadError(err, req, res, next)
        return
      }
      next()
    })
  },
  uploadFile,
)
router.get('/settings', authMiddleware, getSettings)
router.put('/settings', authMiddleware, updateSettings)

export default router
