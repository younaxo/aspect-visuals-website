import type { NextFunction, Response } from 'express'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from './auth'

const ADMIN_ROLE_IDS = new Set([
  '1541875062208995328',
  '1541784961986596874',
  '1541875599331561604',
  '1541785126856429568',
])

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { roles: true },
  })

  const allowed = user?.roles.some((role) => ADMIN_ROLE_IDS.has(role.discordId))
  if (!allowed) {
    res.status(403).json({ message: 'Недостаточно прав' })
    return
  }

  next()
}
