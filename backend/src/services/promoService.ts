import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'

export type PromoRecord = {
  id: string
  code: string
  type: string
  value: Prisma.Decimal
  minOrderAmount: Prisma.Decimal | null
  subscriptionType?: string | null
  durationDays?: number | null
  note?: string | null
  folderId?: string | null
  validFrom: Date
  validUntil: Date | null
  maxUses: number
  usedCount: number
  oncePerUser: boolean
  isActive: boolean
}

function money(value: Prisma.Decimal | number | string): number {
  return Number(value)
}

export function computeDiscount(amount: number, promo: PromoRecord): number {
  const raw =
    promo.type === 'PERCENTAGE' ? (amount * money(promo.value)) / 100 : money(promo.value)
  return Math.max(0, Math.min(amount, Math.round(raw * 100) / 100))
}

export function serializePromo(promo: PromoRecord) {
  return {
    id: promo.id,
    code: promo.code,
    type: promo.type,
    value: money(promo.value),
    minOrderAmount: money(promo.minOrderAmount ?? 0),
    subscriptionType: promo.subscriptionType ?? null,
    durationDays: promo.durationDays ?? null,
    note: promo.note ?? null,
    folderId: promo.folderId ?? null,
    validFrom: promo.validFrom,
    validUntil: promo.validUntil,
    maxUses: promo.maxUses,
    usedCount: promo.usedCount,
    oncePerUser: promo.oncePerUser,
    isActive: promo.isActive,
  }
}

export async function inspectPromo(code: string, userId?: string | null, amount?: number) {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.trim().toUpperCase() },
  })

  if (!promo || !promo.isActive) {
    return { ok: false as const, message: 'Промокод недействителен' }
  }

  const now = new Date()
  if (promo.validFrom > now) {
    return { ok: false as const, message: 'Промокод ещё не действует' }
  }
  if (promo.validUntil && promo.validUntil < now) {
    return { ok: false as const, message: 'Срок действия промокода истёк' }
  }
  if (promo.usedCount >= promo.maxUses) {
    return { ok: false as const, message: 'Лимит использований промокода исчерпан' }
  }

  if (userId && promo.oncePerUser) {
    const used = await prisma.promoCodeUsed.findFirst({
      where: { userId, promoCodeId: promo.id },
    })
    if (used) {
      return { ok: false as const, message: 'Вы уже использовали этот промокод' }
    }
  }

  const orderAmount = Number.isFinite(amount) ? Number(amount) : 0
  const minAmount = money(promo.minOrderAmount ?? 0)
  if (minAmount > 0 && orderAmount > 0 && orderAmount < minAmount) {
    return { ok: false as const, message: `Минимальная сумма заказа — ${minAmount} ₽` }
  }

  if (promo.type === 'BASIC' || promo.type === 'PREMIUM' || promo.type === 'SUBSCRIPTION') {
    return { ok: true as const, promo, discount: 0, total: orderAmount }
  }

  const discount = Number.isFinite(amount) ? computeDiscount(orderAmount, promo) : 0
  return {
    ok: true as const,
    promo,
    discount,
    total: Math.max(0, Math.round((orderAmount - discount) * 100) / 100),
  }
}
