import type { Response } from 'express'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from '../middleware/auth'
import { activateSubscription } from './shopController'

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function asDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function serializeBonus(item: {
  id: string
  code: string
  days: number
  subscriptionType: string
  maxUses: number
  usedCount: number
  oncePerUser: boolean
  isActive: boolean
  validUntil: Date | null
}) {
  return item
}

export async function redeemBonus(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }

    const code = asString(req.body?.code).toUpperCase()
    if (!code) {
      res.status(400).json({ message: 'Укажите бонус-код' })
      return
    }

    const bonus = await prisma.bonusCode.findUnique({ where: { code } })
    if (!bonus || !bonus.isActive) {
      res.status(400).json({ message: 'Бонус-код недействителен' })
      return
    }
    if (bonus.validUntil && bonus.validUntil < new Date()) {
      res.status(400).json({ message: 'Срок действия бонус-кода истёк' })
      return
    }
    if (bonus.usedCount >= bonus.maxUses) {
      res.status(400).json({ message: 'Лимит использований исчерпан' })
      return
    }
    if (bonus.oncePerUser) {
      const used = await prisma.bonusCodeUsed.findFirst({
        where: { userId: req.userId, bonusCodeId: bonus.id },
      })
      if (used) {
        res.status(400).json({ message: 'Вы уже использовали этот бонус-код' })
        return
      }
    }

    const subscription = await prisma.subscription.findFirst({
      where: { type: bonus.subscriptionType, isActive: true },
      orderBy: { duration: 'asc' },
    })
    if (!subscription) {
      res.status(400).json({ message: 'Подписка для бонуса не найдена' })
      return
    }

    await activateSubscription(req.userId, subscription.id, bonus.days)
    await prisma.bonusCodeUsed.create({
      data: { userId: req.userId, bonusCodeId: bonus.id },
    })
    await prisma.bonusCode.update({
      where: { id: bonus.id },
      data: { usedCount: { increment: 1 } },
    })

    res.json({
      ok: true,
      days: bonus.days,
      subscriptionType: bonus.subscriptionType,
      name: subscription.name,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось применить бонус-код'
    res.status(400).json({ message })
  }
}

export async function createBonus(req: AuthRequest, res: Response) {
  const code = asString(req.body?.code).toUpperCase()
  const days = Math.max(1, Number(req.body?.days) || 0)
  const subscriptionType = asString(req.body?.subscriptionType).toUpperCase() || 'BASIC'
  if (!code || !days) {
    res.status(400).json({ message: 'Укажите код и количество дней' })
    return
  }
  if (subscriptionType !== 'BASIC' && subscriptionType !== 'PREMIUM') {
    res.status(400).json({ message: 'Тип подписки: BASIC или PREMIUM' })
    return
  }

  try {
    const bonus = await prisma.bonusCode.create({
      data: {
        code,
        days,
        subscriptionType,
        maxUses: Math.max(1, Number(req.body?.maxUses) || 1),
        oncePerUser: req.body?.oncePerUser !== false,
        validUntil: asDate(req.body?.validUntil),
        createdBy: req.userId,
      },
    })
    res.status(201).json({ bonus: serializeBonus(bonus) })
  } catch {
    res.status(400).json({ message: 'Такой бонус-код уже существует' })
  }
}

export async function updateBonus(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const existing = await prisma.bonusCode.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ message: 'Бонус-код не найден' })
    return
  }

  const bonus = await prisma.bonusCode.update({
    where: { id },
    data: {
      days: Number(req.body?.days) || existing.days,
      subscriptionType: asString(req.body?.subscriptionType) || existing.subscriptionType,
      maxUses: Number(req.body?.maxUses) || existing.maxUses,
      isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
      validUntil: req.body?.validUntil === undefined ? undefined : asDate(req.body.validUntil),
    },
  })
  res.json({ bonus: serializeBonus(bonus) })
}

export async function deleteBonus(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const existing = await prisma.bonusCode.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ message: 'Бонус-код не найден' })
    return
  }
  await prisma.bonusCode.update({
    where: { id },
    data: { isActive: false },
  })
  res.json({ ok: true })
}

export async function listBonus(_req: AuthRequest, res: Response) {
  const items = await prisma.bonusCode.findMany({
    include: { _count: { select: { usedBy: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    bonusCodes: items.map((item) => ({
      ...serializeBonus(item),
      uses: item._count.usedBy,
    })),
  })
}
