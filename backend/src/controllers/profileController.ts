import path from 'path'
import type { Response } from 'express'
import type { UserSettings } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { toPublicUser } from '../utils/user'
import { deleteLocalUpload, toPublicUploadUrl } from '../utils/media'
import { ensureUserSettings } from '../utils/settings'
import { ensureUserUid } from '../utils/uid'
import type { AuthRequest } from '../middleware/auth'

const STATUS_VALUES = new Set(['online', 'idle', 'dnd', 'offline'])
const THEME_VALUES = new Set(['dark', 'light', 'system'])
const LANGUAGE_VALUES = new Set(['ru', 'en'])

function asOptionalString(value: unknown, field: string, max: number): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new Error(`${field} должно быть строкой`)
  }

  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > max) {
    throw new Error(`${field} слишком длинное`)
  }
  return trimmed
}

function asOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    throw new Error(`${field} должно быть boolean`)
  }
  return value
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true, settings: true },
  })
}

async function profilePayload(user: NonNullable<Awaited<ReturnType<typeof loadUser>>>, settings: UserSettings) {
  const uid = await ensureUserUid(user.id, { username: user.username })
  return {
    user: toPublicUser({ ...user, discriminator: String(uid) }),
    settings,
    subscriptions: (
      await prisma.userSubscription.findMany({
        where: { userId: user.id, isActive: true, endDate: { gt: new Date() } },
        include: { subscription: true },
      })
    ).map((item) => ({
      id: item.id,
      name: item.subscription.name,
      expiresAt: item.subscription.duration <= 0 ? null : item.endDate.toISOString(),
    })),
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const user = await loadUser(req.userId)
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    const settings = user.settings ?? (await ensureUserSettings(user.id))
    res.json(await profilePayload(user, settings))
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Не удалось получить профиль' })
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const username = asOptionalString(req.body?.username, 'Имя пользователя', 32)
    const bio = asOptionalString(req.body?.bio, 'Описание', 1000)
    const location = asOptionalString(req.body?.location, 'Местоположение', 80)
    const website = asOptionalString(req.body?.website, 'Сайт', 200)
    const customStatus = asOptionalString(req.body?.customStatus, 'Статус', 128)
    const statusRaw = asOptionalString(req.body?.status, 'Статус присутствия', 16)

    if (username !== undefined && username !== null && username.length < 2) {
      res.status(400).json({ message: 'Имя пользователя должно быть не короче 2 символов' })
      return
    }

    if (website && !isHttpUrl(website)) {
      res.status(400).json({ message: 'Сайт должен быть ссылкой http или https' })
      return
    }

    if (statusRaw && !STATUS_VALUES.has(statusRaw)) {
      res.status(400).json({ message: 'Недопустимый статус присутствия' })
      return
    }

    const data: Record<string, string | null> = {}
    if (username !== undefined && username !== null) data.username = username
    if (bio !== undefined) data.bio = bio
    if (location !== undefined) data.location = location
    if (website !== undefined) data.website = website
    if (customStatus !== undefined) data.customStatus = customStatus
    if (statusRaw !== undefined && statusRaw !== null) data.status = statusRaw

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      include: { roles: true, settings: true },
    })

    const settings = user.settings ?? (await ensureUserSettings(user.id))
    res.json(await profilePayload(user, settings))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось обновить профиль'
    const status = message.includes('должно') || message.includes('длинное') ? 400 : 500
    if (status === 500) console.error('Update profile error:', error)
    res.status(status).json({ message })
  }
}

export async function updateAvatar(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const avatar = asOptionalString(req.body?.avatar, 'Аватар', 500)
    const current = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!current) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    if (current.avatar !== avatar) {
      deleteLocalUpload(current.avatar)
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatar },
      include: { roles: true, settings: true },
    })

    const settings = user.settings ?? (await ensureUserSettings(user.id))
    res.json(await profilePayload(user, settings))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось обновить аватар'
    const status = message.includes('должно') || message.includes('длинное') ? 400 : 500
    if (status === 500) console.error('Update avatar error:', error)
    res.status(status).json({ message })
  }
}

export async function updateBanner(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const banner = asOptionalString(req.body?.banner, 'Баннер', 500)
    const current = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!current) {
      res.status(404).json({ message: 'Пользователь не найден' })
      return
    }

    if (current.banner !== banner) {
      deleteLocalUpload(current.banner)
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { banner },
      include: { roles: true, settings: true },
    })

    const settings = user.settings ?? (await ensureUserSettings(user.id))
    res.json(await profilePayload(user, settings))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось обновить баннер'
    const status = message.includes('должно') || message.includes('длинное') ? 400 : 500
    if (status === 500) console.error('Update banner error:', error)
    res.status(status).json({ message })
  }
}

export async function uploadFile(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const file = req.file
    if (!file) {
      res.status(400).json({ message: 'Файл не получен' })
      return
    }

    const kind = path.basename(file.destination) === 'banners' ? 'banners' : 'avatars'
    const url = toPublicUploadUrl(kind, file.filename)
    res.json({ url, kind })
  } catch (error) {
    console.error('Upload file error:', error)
    res.status(500).json({ message: 'Не удалось загрузить файл' })
  }
}

export async function getSettings(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const settings = await ensureUserSettings(req.userId)
    res.json({ settings })
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ message: 'Не удалось получить настройки' })
  }
}

export async function updateSettings(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Пользователь не авторизован' })
      return
    }

    const theme = asOptionalString(req.body?.theme, 'Тема', 16)
    const language = asOptionalString(req.body?.language, 'Язык', 8)
    const notifications = asOptionalBoolean(req.body?.notifications, 'Уведомления')
    const soundEnabled = asOptionalBoolean(req.body?.soundEnabled, 'Звуки')
    const compactSidebar = asOptionalBoolean(req.body?.compactSidebar, 'Компактный сайдбар')
    const animations = asOptionalBoolean(req.body?.animations, 'Анимации')

    if (theme && !THEME_VALUES.has(theme)) {
      res.status(400).json({ message: 'Недопустимая тема' })
      return
    }

    if (language && !LANGUAGE_VALUES.has(language)) {
      res.status(400).json({ message: 'Недопустимый язык' })
      return
    }

    await ensureUserSettings(req.userId)

    const settings = await prisma.userSettings.update({
      where: { userId: req.userId },
      data: {
        ...(theme ? { theme } : {}),
        ...(language ? { language } : {}),
        ...(notifications !== undefined ? { notifications } : {}),
        ...(soundEnabled !== undefined ? { soundEnabled } : {}),
        ...(compactSidebar !== undefined ? { compactSidebar } : {}),
        ...(animations !== undefined ? { animations } : {}),
      },
    })

    res.json({ settings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось обновить настройки'
    const status = message.includes('должно') ? 400 : 500
    if (status === 500) console.error('Update settings error:', error)
    res.status(status).json({ message })
  }
}
