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

export async function createPromoCode(req: AuthRequest, res: Response) {
  const code = asString(req.body?.code).toUpperCase()
  const type = asString(req.body?.type).toUpperCase()
  const value = asNumber(req.body?.value)
  if (!code || (type !== 'PERCENTAGE' && type !== 'FIXED') || value == null || value <= 0) {
    res.status(400).json({ message: 'Укажите код, тип и значение скидки' })
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
        type,
        value,
        minOrderAmount: asNumber(req.body?.minOrderAmount, 0) ?? 0,
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
  if (type !== 'PERCENTAGE' && type !== 'FIXED') {
    res.status(400).json({ message: 'Некорректный тип промокода' })
    return
  }

  const promo = await prisma.promoCode.update({
    where: { id },
    data: {
      type,
      value: value ?? Number(existing.value),
      minOrderAmount: asNumber(req.body?.minOrderAmount, Number(existing.minOrderAmount ?? 0)),
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

  // История использований сохраняется: деактивируем, а не удаляем записи
  await prisma.promoCode.update({
    where: { id },
    data: { isActive: false },
  })
  res.json({ ok: true, preservedUses: existing._count.usedBy + existing._count.purchases })
}

export async function getAllPromoCodes(_req: AuthRequest, res: Response) {
  const items = await prisma.promoCode.findMany({
    include: { _count: { select: { usedBy: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    promoCodes: items.map((item) => ({
      ...serializePromo(item),
      uses: item._count.usedBy,
    })),
  })
}
