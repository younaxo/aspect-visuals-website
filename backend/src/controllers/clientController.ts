import type { Request, Response } from 'express'
import type { AuthRequest } from '../middleware/auth'
import type { ClientRequest } from '../middleware/clientSession'
import { prisma } from '../utils/prisma'
import { ensureUserUid } from '../utils/uid'
import {
  createDeviceAuthorization,
  decideDeviceAuthorization,
  exchangeDeviceCode,
  findPendingByUserCode,
  listClientSessions,
  refreshClientSession,
  revokeClientSession,
} from '../services/clientAuthService'
import { signingConfigured } from '../services/launchService'

const MAX_CLIENT_NAME = 48
const MAX_CLIENT_VERSION = 32
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g

function asString(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(CONTROL_CHARS, '').slice(0, max)
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

/** Аватар может лежать локально — клиенту нужен абсолютный адрес. */
function absoluteMediaUrl(value: string | null): string | null {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (!value.startsWith('/uploads/')) return null

  const base = (process.env.BACKEND_URL || '').trim().replace(/\/+$/, '')
  return base ? `${base}${value}` : null
}

/** Клиент запрашивает одноразовый код и ссылку подтверждения. */
export async function requestDeviceCode(req: Request, res: Response) {
  if (!signingConfigured()) {
    res.status(503).json({ error: 'server_error', message: 'Авторизация клиента временно недоступна' })
    return
  }

  const clientName = asString(req.body?.clientName, MAX_CLIENT_NAME) || 'Aspect Visuals'
  const clientVersion = asString(req.body?.clientVersion, MAX_CLIENT_VERSION) || null

  try {
    const request = await createDeviceAuthorization(clientName, clientVersion, req.ip)
    res.status(201).json(request)
  } catch (error) {
    console.error('Device code error:', error instanceof Error ? error.message : error)
    res.status(500).json({ error: 'server_error', message: 'Не удалось создать запрос авторизации' })
  }
}

/** Клиент опрашивает статус кода и в случае подтверждения получает токен сессии. */
export async function exchangeDeviceToken(req: Request, res: Response) {
  const deviceCode = typeof req.body?.deviceCode === 'string' ? req.body.deviceCode.trim() : ''

  try {
    const result = await exchangeDeviceCode(deviceCode, req.ip)
    if (!result.ok) {
      const status = result.error === 'authorization_pending' || result.error === 'slow_down' ? 202 : 400
      res.status(status).json({ error: result.error, message: result.message })
      return
    }
    res.json(result.value)
  } catch (error) {
    console.error('Device exchange error:', error instanceof Error ? error.message : error)
    res.status(500).json({ error: 'server_error', message: 'Не удалось завершить авторизацию' })
  }
}

/** Страница подтверждения на сайте показывает, что именно подключается. */
export async function readDeviceRequest(req: AuthRequest, res: Response) {
  const pending = await findPendingByUserCode(routeParam(req.params.code))
  if (!pending) {
    res.status(404).json({ message: 'Код не найден' })
    return
  }
  res.json(pending)
}

export async function approveDeviceRequest(req: AuthRequest, res: Response) {
  await decide(req, res, true)
}

export async function denyDeviceRequest(req: AuthRequest, res: Response) {
  await decide(req, res, false)
}

async function decide(req: AuthRequest, res: Response, approve: boolean) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const result = await decideDeviceAuthorization(routeParam(req.params.code), req.userId, approve, req.ip)
  if (!result.ok) {
    res.status(400).json({ message: result.reason })
    return
  }
  res.json({ ok: true, status: approve ? 'APPROVED' : 'DENIED' })
}

/**
 * Профиль для Minecraft-клиента.
 * Возвращаем только то, что рисуется в интерфейсе клиента: ни почты,
 * ни баланса, ни платёжных данных, ни служебных полей аккаунта.
 */
export async function clientProfile(req: ClientRequest, res: Response) {
  if (!req.clientUserId || !req.clientSessionId) {
    res.status(401).json({ error: 'unauthorized', message: 'Нужна авторизация' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: req.clientUserId },
    include: { roles: true },
  })
  if (!user || user.isDeleted) {
    res.status(401).json({ error: 'unauthorized', message: 'Аккаунт недоступен' })
    return
  }

  const uid = await ensureUserUid(user.id, { username: user.username })

  const now = new Date()
  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      userId: user.id,
      isActive: true,
      OR: [{ endDate: { gt: now } }, { subscription: { duration: { lte: 0 } } }],
    },
    include: { subscription: true },
    orderBy: { endDate: 'desc' },
  })

  const active = subscriptions[0] ?? null
  const permanent = active ? active.subscription.duration <= 0 : false

  await prisma.gameSession.updateMany({
    where: { id: req.clientSessionId, endedAt: null },
    data: { lastSeenAt: now },
  })

  res.json({
    id: user.id,
    username: user.username,
    uid,
    displayName: user.customStatus?.trim() || user.username,
    avatar: absoluteMediaUrl(user.avatar),
    roles: user.roles.map((role) => role.name),
    subscription: active
      ? {
          name: active.subscription.name,
          type: active.subscription.type,
          permanent,
          purchasedAt: active.startDate.toISOString(),
          expiresAt: permanent ? null : active.endDate.toISOString(),
          daysLeft: permanent
            ? null
            : Math.max(0, Math.ceil((active.endDate.getTime() - now.getTime()) / 86_400_000)),
        }
      : null,
    createdAt: user.createdAt.toISOString(),
    session: { id: req.clientSessionId },
  })
}

export async function refreshSession(req: ClientRequest, res: Response) {
  if (!req.clientUserId || !req.clientSessionId) {
    res.status(401).json({ error: 'unauthorized', message: 'Нужна авторизация' })
    return
  }

  const refreshed = await refreshClientSession(req.clientSessionId, req.clientUserId)
  if (!refreshed) {
    res.status(401).json({ error: 'session_expired', message: 'Сессия уже завершена' })
    return
  }
  res.json(refreshed)
}

/** Выход из аккаунта в самом клиенте. */
export async function logoutClient(req: ClientRequest, res: Response) {
  if (!req.clientUserId || !req.clientSessionId) {
    res.status(401).json({ error: 'unauthorized', message: 'Нужна авторизация' })
    return
  }

  await revokeClientSession(req.clientSessionId, req.clientUserId, 'Выход из клиента')
  res.json({ ok: true })
}

/** Список подключённых клиентов в личном кабинете. */
export async function listSessions(req: AuthRequest & ClientRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const current = req.clientUserId === req.userId ? req.clientSessionId : undefined
  res.json({ sessions: await listClientSessions(req.userId, current) })
}

export async function revokeSession(req: AuthRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const ok = await revokeClientSession(routeParam(req.params.id), req.userId, 'Отозвано с сайта')
  if (!ok) {
    res.status(404).json({ message: 'Сессия не найдена или уже завершена' })
    return
  }
  res.json({ ok: true })
}
