import type { NextFunction, Response } from 'express'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from './auth'
import { isOwnerRole, isPanelAdminRoles } from '../utils/roles'

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { roles: true },
  })

  const ids = user?.roles.map((role) => role.discordId) ?? []
  if (!isPanelAdminRoles(ids)) {
    res.status(403).json({ message: 'Недостаточно прав' })
    return
  }

  next()
}

export async function ownerOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { roles: true },
  })
  const ids = user?.roles.map((role) => role.discordId) ?? []
  if (!isOwnerRole(ids)) {
    res.status(403).json({ message: 'Только Owner может выполнить это действие' })
    return
  }
  next()
}
