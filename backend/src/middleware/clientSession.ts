import type { NextFunction, Request, Response } from 'express'
import { resolveClientSession } from '../services/clientAuthService'

export interface ClientRequest extends Request {
  clientSessionId?: string
  clientUserId?: string
}

/**
 * Авторизация Minecraft-клиента по токену игровой сессии.
 * Токен подписан бэкендом, но право доступа каждый раз перепроверяется по базе:
 * отозванная с сайта сессия перестаёт работать сразу.
 */
export async function clientSessionMiddleware(req: ClientRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'Нужен токен сессии клиента' })
    return
  }

  const session = await resolveClientSession(token)
  if (!session) {
    res.status(401).json({ error: 'session_expired', message: 'Сессия клиента недействительна' })
    return
  }

  req.clientSessionId = session.sessionId
  req.clientUserId = session.userId
  next()
}

/** Для эндпоинтов сайта, где токен клиента лишь помечает текущую сессию в списке. */
export async function optionalClientSession(req: ClientRequest, _res: Response, next: NextFunction) {
  const header = req.headers['x-aspect-client-session']
  const token = typeof header === 'string' ? header : null
  if (token) {
    const session = await resolveClientSession(token)
    if (session) {
      req.clientSessionId = session.sessionId
      req.clientUserId = session.userId
    }
  }
  next()
}
