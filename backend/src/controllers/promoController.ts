import type { Response } from 'express'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from '../middleware/auth'
import { inspectPromo, serializePromo } from '../services/promoService'

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function asNumber(value: unknown, fallback: number | null = null): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export async function validatePromoCode(req: AuthRequest, res: Response) {
  const code = asString(req.body?.code)
  const amount = asNumber(req.body?.amount, 0) ?? 0
  if (!code) {
    res.status(400).json({ message: 'Укажите промокод' })
    return
  }
  const result = await inspectPromo(code, req.userId, amount)
  if (!result.ok) {
    res.status(400).json({ message: result.message })
    return
  }
  res.json({
    promo: serializePromo(result.promo),
    discount: result.discount,
    total: result.total,
  })
}

export async function applyPromoCode(req: AuthRequest, res: Response) {
  await validatePromoCode(req, res)
}

export async function removePromoCode(_req: AuthRequest, res: Response) {
  res.json({ ok: true })
}

export async function getPromoCodeInfo(req: AuthRequest, res: Response) {
  const code = routeParam(req.params.code)
  const result = await inspectPromo(code, req.userId)
  if (!result.ok) {
    res.status(404).json({ message: result.message })
    return
  }
  res.json({ promo: serializePromo(result.promo) })
}

export async function redeemPromo(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }
    const code = asString(req.body?.code).toUpperCase()
    const result = await inspectPromo(code, req.userId)
    if (!result.ok) {
      res.status(400).json({ message: result.message })
      return
    }
    const promo = result.promo
    const subType = (promo.subscriptionType || (promo.type === 'BASIC' || promo.type === 'PREMIUM' ? promo.type : '')).toUpperCase()
    if (subType !== 'BASIC' && subType !== 'PREMIUM') {
      res.status(400).json({ message: 'Этот промокод применяется в корзине как скидка' })
      return
    }
    const { activateSubscription } = await import('./shopController')
    const subscription = await prisma.subscription.findFirst({
      where: { type: subType, isActive: true },
      orderBy: { duration: 'asc' },
    })
    if (!subscription) {
      res.status(400).json({ message: 'Подписка для промокода не найдена' })
      return
    }
    const days = promo.durationDays ?? 0
    await activateSubscription(req.userId, subscription.id, days)
    await prisma.promoCodeUsed.create({ data: { userId: req.userId, promoCodeId: promo.id } })
    await prisma.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })
    res.json({ ok: true, days, subscriptionType: subType, name: subscription.name })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось применить промокод'
    res.status(400).json({ message })
  }
}

export async function createPromoCode(req: AuthRequest, res: Response) {
  const code = asString(req.body?.code).toUpperCase() || `PROMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const type = asString(req.body?.type).toUpperCase()
  const allowed = new Set(['PERCENTAGE', 'FIXED', 'BASIC', 'PREMIUM', 'SUBSCRIPTION'])
  if (!allowed.has(type)) {
    res.status(400).json({ message: 'Укажите тип: скидка или BASIC/PREMIUM' })
    return
  }

  const durationDays = asNumber(req.body?.durationDays)
  const value = asNumber(req.body?.value, 0) ?? 0
  const subscriptionType =
    asString(req.body?.subscriptionType).toUpperCase() || (type === 'BASIC' || type === 'PREMIUM' ? type : '')

  if ((type === 'BASIC' || type === 'PREMIUM' || type === 'SUBSCRIPTION') && durationDays == null) {
    res.status(400).json({ message: 'Укажите срок в днях (0 — навсегда)' })
    return
  }
  if ((type === 'PERCENTAGE' || type === 'FIXED') && value <= 0) {
    res.status(400).json({ message: 'Укажите значение скидки' })
    return
  }
  if (type === 'PERCENTAGE' && value > 100) {
    res.status(400).json({ message: 'Процент скидки не может быть больше 100' })
    return
  }

  try {
    const promo = await prisma.promoCode.create({
      data: {
        code,
        type: type === 'SUBSCRIPTION' ? subscriptionType || 'BASIC' : type,
        value,
        minOrderAmount: asNumber(req.body?.minOrderAmount, 0) ?? 0,
        subscriptionType: subscriptionType || null,
        durationDays,
        note: asString(req.body?.note) || null,
        folderId: asString(req.body?.folderId) || null,
        validFrom: asDate(req.body?.validFrom) ?? new Date(),
        validUntil: asDate(req.body?.validUntil),
        maxUses: Math.max(1, asNumber(req.body?.maxUses, 1) ?? 1),
        oncePerUser: req.body?.oncePerUser !== false,
        isActive: req.body?.isActive !== false,
        createdBy: req.userId,
      },
    })
    res.status(201).json({ promo: serializePromo(promo) })
  } catch {
    res.status(400).json({ message: 'Такой промокод уже существует' })
  }
}

export async function updatePromoCode(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const existing = await prisma.promoCode.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ message: 'Промокод не найден' })
    return
  }

  const type = asString(req.body?.type).toUpperCase() || existing.type
  const value = asNumber(req.body?.value, Number(existing.value))

  const promo = await prisma.promoCode.update({
    where: { id },
    data: {
      type,
      value: value ?? Number(existing.value),
      minOrderAmount: asNumber(req.body?.minOrderAmount, Number(existing.minOrderAmount ?? 0)),
      subscriptionType: req.body?.subscriptionType === undefined ? undefined : asString(req.body.subscriptionType) || null,
      durationDays: req.body?.durationDays === undefined ? undefined : asNumber(req.body.durationDays),
      note: req.body?.note === undefined ? undefined : asString(req.body.note) || null,
      folderId: req.body?.folderId === undefined ? undefined : asString(req.body.folderId) || null,
      validUntil: req.body?.validUntil === undefined ? undefined : asDate(req.body.validUntil),
      maxUses: asNumber(req.body?.maxUses, existing.maxUses) ?? existing.maxUses,
      oncePerUser: typeof req.body?.oncePerUser === 'boolean' ? req.body.oncePerUser : undefined,
      isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
    },
  })
  res.json({ promo: serializePromo(promo) })
}

export async function deletePromoCode(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const existing = await prisma.promoCode.findUnique({
    where: { id },
    include: { _count: { select: { usedBy: true, purchases: true } } },
  })
  if (!existing) {
    res.status(404).json({ message: 'Промокод не найден' })
    return
  }

  await prisma.promoCode.update({
    where: { id },
    data: { isActive: false },
  })
  res.json({ ok: true, preservedUses: existing._count.usedBy + existing._count.purchases })
}

export async function getAllPromoCodes(_req: AuthRequest, res: Response) {
  const items = await prisma.promoCode.findMany({
    include: { _count: { select: { usedBy: true } }, folder: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    promoCodes: items.map((item) => ({
      ...serializePromo(item),
      uses: item._count.usedBy,
      folder: item.folder,
    })),
  })
}
