import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../utils/prisma'

export interface AuthRequest extends Request {
  userId?: string
  discordId?: string
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      res.status(401).json({ message: 'Токен авторизации отсутствует' })
      return
    }

    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })

    if (!user) {
      res.status(401).json({ message: 'Пользователь не найден' })
      return
    }

    req.userId = user.id
    req.discordId = user.discordId
    next()
  } catch {
    res.status(401).json({ message: 'Недействительный токен' })
  }
}
