import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth'
import * as chatService from '../services/chatService'
import { accessibleChannels } from '../utils/roles'
import { prisma } from '../utils/prisma'

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

export async function getMessages(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }
    const channel = routeParam(req.params.channel)
    const before = routeParam(req.params.before) || asString(req.query.before)
    const messages = await chatService.getMessages(req.userId, channel, before || undefined)
    res.json({ messages })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось загрузить сообщения'
    res.status(400).json({ message })
  }
}

export async function getOnline(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }
    const users = await chatService.getOnlineUsers(req.userId)
    res.json({ users })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось загрузить онлайн'
    res.status(400).json({ message })
  }
}

export async function getUnread(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }
    const unread = await chatService.getUnreadCount(req.userId)
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { roles: true },
    })
    res.json({
      unread,
      channels: accessibleChannels(user?.roles.map((role) => role.discordId) ?? []),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось получить непрочитанные'
    res.status(400).json({ message })
  }
}

export async function markRead(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }
    await chatService.markRead(req.userId, asString(req.body?.channel) || 'general')
    res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось отметить прочитанным'
    res.status(400).json({ message })
  }
}
