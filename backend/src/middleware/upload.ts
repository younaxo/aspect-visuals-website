import fs from 'fs'
import path from 'path'
import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import { ensureUploadDirs, UPLOADS_DIR } from '../utils/media'
import type { AuthRequest } from './auth'

ensureUploadDirs()

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function resolveKind(req: Request): 'avatars' | 'banners' {
  const raw = typeof req.query.kind === 'string' ? req.query.kind : 'avatar'
  return raw === 'banner' ? 'banners' : 'avatars'
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, resolveKind(req))
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png'
    const userId = (req as AuthRequest).userId ?? 'anon'
    cb(null, `${userId}-${Date.now()}${ext}`)
  },
})

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true)
      return
    }
    cb(new Error('Допустимы только изображения JPEG, PNG, WEBP и GIF'))
  },
})

export function handleUploadError(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (!err) {
    next()
    return
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'Файл слишком большой (макс. 5 МБ)' })
      return
    }
    res.status(400).json({ message: 'Не удалось загрузить файл' })
    return
  }

  if (err instanceof Error) {
    res.status(400).json({ message: err.message })
    return
  }

  next(err)
}
