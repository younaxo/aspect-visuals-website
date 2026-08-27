import type { Request, Response } from 'express'
import type { AuthRequest } from '../middleware/auth'
import {
  LAUNCH_TTL_MS,
  endSession,
  getManifest,
  issueLaunchToken,
  publicKeyPem,
  redeemLaunchToken,
  signingConfigured,
  touchSession,
  verifySessionToken,
} from '../services/launchService'

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

/** Лаунчер получает короткоживущий одноразовый токен для запуска клиента. */
export async function createLaunchToken(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }
    if (!signingConfigured()) {
      console.error('[launch] LAUNCH_SIGNING_PRIVATE_KEY не задан')
      res.status(503).json({ message: 'Запуск временно недоступен' })
      return
    }

    const { token, expiresAt } = await issueLaunchToken(req.userId, req.ip)
    console.log(`[launch] выдан токен пользователю ${req.userId}`)

    res.json({ token, expiresAt: expiresAt.toISOString(), ttlMs: LAUNCH_TTL_MS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось выдать токен запуска'
    console.error('Launch token error:', message)
    res.status(400).json({ message })
  }
}

/** Клиент обменивает токен на игровую сессию. Роли назначает сервер. */
export async function createGameSession(req: Request, res: Response) {
  try {
    const token = asString(req.body?.token)
    if (!token) {
      res.status(400).json({ message: 'Токен запуска обязателен' })
      return
    }

    const result = await redeemLaunchToken(token, req.ip)
    if (!result.ok || !result.session) {
      console.warn(`[launch] обмен отклонён: ${result.reason}`)
      res.status(401).json({ message: result.reason || 'Токен отклонён' })
      return
    }

    console.log(`[launch] сессия ${result.session.id} для ${result.session.userId}`)
    res.json({ session: result.session })
  } catch (error) {
    console.error('Game session error:', error)
    res.status(500).json({ message: 'Не удалось создать сессию' })
  }
}

/** Клиент подтверждает сессию токеном: одного sessionId недостаточно. */
function sessionFromRequest(req: Request): { sid: string; sub: string } | null {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : asString(req.body?.sessionToken)
  const claims = verifySessionToken(token)
  if (!claims) return null
  return claims.sid === routeParam(req.params.id) ? claims : null
}

export async function heartbeatGameSession(req: Request, res: Response) {
  if (!sessionFromRequest(req)) {
    res.status(401).json({ message: 'Недействительный токен сессии' })
    return
  }
  const ok = await touchSession(routeParam(req.params.id))
  if (!ok) {
    res.status(404).json({ message: 'Сессия не найдена или уже завершена' })
    return
  }
  res.json({ ok: true })
}

/** Завершить сессию может её клиент по токену либо владелец аккаунта. */
export async function closeGameSession(req: AuthRequest, res: Response) {
  const claims = sessionFromRequest(req)
  const userId = claims ? claims.sub : req.userId

  if (!userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const ok = await endSession(routeParam(req.params.id), userId)
  if (!ok) {
    res.status(404).json({ message: 'Сессия не найдена или уже завершена' })
    return
  }
  res.json({ ok: true })
}

/** Подписанный манифест файлов клиента. */
export async function clientManifest(req: Request, res: Response) {
  try {
    const channel = asString(req.query.channel) || 'stable'
    const manifest = await getManifest(channel)

    if (!manifest) {
      res.status(404).json({ message: `Активная версия клиента для канала ${channel} не опубликована` })
      return
    }

    res.json(manifest)
  } catch (error) {
    console.error('Client manifest error:', error)
    res.status(500).json({ message: 'Не удалось загрузить манифест' })
  }
}

/** Публичный ключ для проверки подписи манифеста в лаунчере. */
export function launchPublicKey(_req: Request, res: Response) {
  if (!signingConfigured()) {
    res.status(503).json({ message: 'Подпись не настроена' })
    return
  }
  res.type('text/plain').send(publicKeyPem())
}
