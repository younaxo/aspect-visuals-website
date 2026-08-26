import fs from 'fs'
import path from 'path'

export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')

const CUSTOM_PREFIXES = ['/uploads/', 'http://', 'https://']

export function isCustomMedia(value?: string | null): boolean {
  if (!value) return false
  return CUSTOM_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function ensureUploadDirs() {
  for (const dir of ['avatars', 'banners']) {
    fs.mkdirSync(path.join(UPLOADS_DIR, dir), { recursive: true })
  }
}

export function toPublicUploadUrl(kind: 'avatars' | 'banners', filename: string): string {
  return `/uploads/${kind}/${filename}`
}

export function deleteLocalUpload(url?: string | null) {
  if (!url || !url.startsWith('/uploads/')) return

  const relative = url.replace(/^\/uploads\//, '')
  const filePath = path.join(UPLOADS_DIR, relative)
  if (!filePath.startsWith(UPLOADS_DIR)) return

  fs.unlink(filePath, () => {
    // Файл мог уже быть удалён — это не ошибка для клиента
  })
}
