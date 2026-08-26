import type { NextFunction, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from './auth'

export async function writeAdminLog(params: {
  adminId: string
  action: string
  targetType: string
  targetId?: string | null
  details?: unknown
  ip?: string | null
  userAgent?: string | null
}) {
  await prisma.adminLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      details:
        params.details === undefined ? undefined : (params.details as Prisma.InputJsonValue),
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    },
  })
}

export function adminLog(action: string, targetType: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    req.adminAction = { action, targetType }
    next()
  }
}

export async function logAdminRequest(req: AuthRequest, action: string, targetType: string, targetId?: string, details?: unknown) {
  if (!req.userId) return
  await writeAdminLog({
    adminId: req.userId,
    action,
    targetType,
    targetId,
    details,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })
}
