import type { Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from '../middleware/auth'
import { createPayment, handleWebhook, type PaymentProvider } from '../services/paymentService'
import {
  giveRole,
  notifyPurchase,
  removeRole,
  syncSubscriptionRoles,
} from '../services/discordService'

const TEST_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000
const NON_GIFTABLE = new Set(['BETA', 'HWID_RESET'])

function money(value: Prisma.Decimal | number | string): number {
  return Number(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function lifetimeEnd(): Date {
  return new Date('9999-12-31T23:59:59.000Z')
}

function addDays(from: Date, days: number): Date {
  if (days <= 0) return lifetimeEnd()
  const next = new Date(from)
  next.setDate(next.getDate() + days)
  return next
}

function serializeSub(item: {
  id: string
  name: string
  description: string | null
  price: Prisma.Decimal
  duration: number
  type: string
  discordRoleId: string | null
  isActive: boolean
}) {
  return {
    ...item,
    price: money(item.price),
    popular: item.type === 'BASIC' && item.duration === 30,
    badge: item.type === 'PREMIUM' ? 'Скидка' : item.type === 'BASIC' && item.duration === 30 ? 'Популярный' : null,
  }
}

function serializeProduct(item: {
  id: string
  name: string
  description: string | null
  price: Prisma.Decimal
  type: string
  giftable: boolean
  isActive: boolean
}) {
  return { ...item, price: money(item.price) }
}

async function findPromo(code: string) {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } })
  if (!promo || !promo.isActive) return null
  if (promo.expiresAt && promo.expiresAt < new Date()) return null
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return null
  return promo
}

function applyDiscount(amount: number, promo: { discountPercent: number | null; discountAmount: Prisma.Decimal | null }) {
  let next = amount
  if (promo.discountPercent) next -= (amount * promo.discountPercent) / 100
  if (promo.discountAmount) next -= money(promo.discountAmount)
  return Math.max(0, Math.round(next * 100) / 100)
}

async function testAvailability(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Пользователь не найден')

  const activePaid = await prisma.userSubscription.findFirst({
    where: {
      userId,
      isActive: true,
      endDate: { gt: new Date() },
      subscription: { type: { not: 'TEST' } },
    },
  })

  const last = user.lastTestSubscriptionAt
  const nextAt = last ? new Date(last.getTime() + TEST_COOLDOWN_MS) : null
  const cooldownActive = Boolean(nextAt && nextAt > new Date())

  return {
    available: !activePaid && !cooldownActive,
    reason: activePaid
      ? 'Тестовая подписка недоступна при активной подписке'
      : cooldownActive
        ? 'Тестовая подписка доступна раз в 3 месяца'
        : null,
    lastActivatedAt: last?.toISOString() ?? null,
    nextAvailableAt: cooldownActive && nextAt ? nextAt.toISOString() : null,
  }
}

async function activateSubscription(userId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
  if (!subscription) return

  const existing = await prisma.userSubscription.findFirst({
    where: { userId, subscriptionId, isActive: true },
    orderBy: { endDate: 'desc' },
  })

  const startFrom = existing && existing.endDate > new Date() ? existing.endDate : new Date()
  const endDate = addDays(startFrom, subscription.duration)

  if (existing) {
    await prisma.userSubscription.update({
      where: { id: existing.id },
      data: { endDate, isActive: true },
    })
  } else {
    await prisma.userSubscription.create({
      data: { userId, subscriptionId, endDate, isActive: true },
    })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.discordId && subscription.discordRoleId) {
    await giveRole(user.discordId, subscription.discordRoleId)
  }
  await syncSubscriptionRoles(userId)
}

function sortSubscriptions<T extends { type: string; duration: number; price: Prisma.Decimal | number }>(items: T[]) {
  const family = (type: string) => (type === 'PREMIUM' ? 1 : 0)
  const days = (duration: number) => (duration <= 0 ? 10_000 : duration)
  return [...items].sort((a, b) => {
    const byFamily = family(a.type) - family(b.type)
    if (byFamily) return byFamily
    const byDays = days(a.duration) - days(b.duration)
    if (byDays) return byDays
    return Number(a.price) - Number(b.price)
  })
}

export async function getSubscriptions(_req: AuthRequest, res: Response) {
  const items = await prisma.subscription.findMany({
    where: { isActive: true, type: { not: 'TEST' } },
  })
  res.json({ subscriptions: sortSubscriptions(items).map(serializeSub) })
}

export async function getProducts(_req: AuthRequest, res: Response) {
  const rank: Record<string, number> = { BETA: 0, HWID_RESET: 1 }
  const items = await prisma.product.findMany({
    where: { isActive: true },
  })
  items.sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9) || Number(a.price) - Number(b.price))
  res.json({ products: items.map(serializeProduct) })
}

export async function getSubscriptionById(req: AuthRequest, res: Response) {
  const item = await prisma.subscription.findFirst({
    where: { id: routeParam(req.params.id), isActive: true },
  })
  if (!item) {
    res.status(404).json({ message: 'Подписка не найдена' })
    return
  }
  res.json({ subscription: serializeSub(item) })
}

export async function applyPromo(req: AuthRequest, res: Response) {
  const code = asString(req.body?.code)
  const amount = Number(req.body?.amount)
  if (!code) {
    res.status(400).json({ message: 'Укажите промокод' })
    return
  }
  const promo = await findPromo(code)
  if (!promo) {
    res.status(400).json({ message: 'Промокод недействителен' })
    return
  }
  const total = Number.isFinite(amount) ? applyDiscount(amount, promo) : null
  res.json({
    promo: {
      id: promo.id,
      code: promo.code,
      discountPercent: promo.discountPercent,
      discountAmount: promo.discountAmount ? money(promo.discountAmount) : null,
    },
    total,
  })
}

export async function createPurchase(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : []
    if (!items.length) {
      res.status(400).json({ message: 'Корзина пуста' })
      return
    }

    const giftToUserId = asString(req.body?.giftToUserId) || null
    const promoCode = asString(req.body?.promoCode)
    const paymentMethod = asString(req.body?.paymentMethod) || 'unitpay'
    const provider = (paymentMethod === 'stripe' ? 'stripe' : 'unitpay') as PaymentProvider

    let promo = promoCode ? await findPromo(promoCode) : null
    const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const createdIds: string[] = []
    let total = 0
    const names: string[] = []

    for (const raw of items) {
      const kind = asString(raw?.kind)
      const id = asString(raw?.id)
      if (kind === 'subscription') {
        const subscription = await prisma.subscription.findFirst({ where: { id, isActive: true } })
        if (!subscription) {
          res.status(400).json({ message: 'Подписка недоступна' })
          return
        }
        const amount = money(subscription.price)
        total += amount
        names.push(subscription.name)
        const purchase = await prisma.purchase.create({
          data: {
            userId: req.userId,
            subscriptionId: subscription.id,
            amount,
            status: 'PENDING',
            paymentMethod: provider,
            orderId,
            giftToUserId,
            promoCodeId: promo?.id,
          },
        })
        createdIds.push(purchase.id)
      } else if (kind === 'product') {
        const product = await prisma.product.findFirst({ where: { id, isActive: true } })
        if (!product) {
          res.status(400).json({ message: 'Товар недоступен' })
          return
        }
        if (giftToUserId && (NON_GIFTABLE.has(product.type) || !product.giftable)) {
          res.status(400).json({ message: `${product.name} нельзя подарить` })
          return
        }
        const amount = money(product.price)
        total += amount
        names.push(product.name)
        const purchase = await prisma.purchase.create({
          data: {
            userId: req.userId,
            productId: product.id,
            amount,
            status: 'PENDING',
            paymentMethod: provider,
            orderId,
            giftToUserId,
            promoCodeId: promo?.id,
          },
        })
        createdIds.push(purchase.id)
      } else {
        res.status(400).json({ message: 'Некорректная позиция корзины' })
        return
      }
    }

    if (promo) {
      total = applyDiscount(total, promo)
      await prisma.purchase.updateMany({
        where: { id: { in: createdIds } },
        data: { amount: total / createdIds.length },
      })
    }

    const payment = await createPayment({
      orderId,
      amount: total,
      description: `Aspect Visuals: ${names.join(', ')}`,
      provider,
    })

    await prisma.purchase.updateMany({
      where: { orderId },
      data: { paymentId: payment.paymentId, paymentMethod: payment.provider },
    })

    res.status(201).json({
      orderId,
      amount: total,
      paymentId: payment.paymentId,
      confirmationUrl: payment.confirmationUrl,
      provider: payment.provider,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось создать платёж'
    res.status(400).json({ message })
  }
}

async function fulfillOrder(orderId: string) {
  const purchases = await prisma.purchase.findMany({
    where: { orderId },
    include: { subscription: true, product: true, user: true, promoCode: true },
  })

  let promoUsed = false
  for (const purchase of purchases) {
    if (purchase.status === 'COMPLETED') continue

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    if (purchase.promoCodeId && !promoUsed) {
      promoUsed = true
      await prisma.promoCode.update({
        where: { id: purchase.promoCodeId },
        data: { usedCount: { increment: 1 } },
      })
    }

    const beneficiaryId = purchase.giftToUserId || purchase.userId

    if (purchase.subscriptionId) {
      await activateSubscription(beneficiaryId, purchase.subscriptionId)
    }

    const itemName = purchase.subscription?.name || purchase.product?.name || 'Покупка'
    await notifyPurchase({
      username: purchase.user.username,
      itemName,
      amount: money(purchase.amount),
    })
  }
}

export async function confirmPurchase(req: AuthRequest, res: Response) {
  const provider = (asString(req.query.provider) || asString(req.body?.provider) || 'unitpay') as PaymentProvider
  const payload = { ...req.query, ...req.body } as Record<string, unknown>
  const result = handleWebhook(payload, provider)

  if (!result.success || !result.orderId) {
    res.json({ result: { message: 'ignored' } })
    return
  }

  await fulfillOrder(result.orderId)
  res.json({ result: { message: 'OK' } })
}

export async function mockComplete(req: AuthRequest, res: Response) {
  if (process.env.PAYMENT_MOCK !== 'true' && process.env.NODE_ENV === 'production') {
    res.status(403).json({ message: 'Мок-оплата отключена' })
    return
  }

  const orderId = routeParam(req.params.orderId)
  const pending = await prisma.purchase.findFirst({ where: { orderId, status: 'PENDING' } })
  if (!pending) {
    res.status(404).json({ message: 'Заказ не найден' })
    return
  }

  await fulfillOrder(orderId)
  res.json({ ok: true, orderId })
}

export async function getUserSubscriptions(req: AuthRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const now = new Date()
  const items = await prisma.userSubscription.findMany({
    where: { userId: req.userId },
    include: { subscription: true },
    orderBy: { endDate: 'desc' },
  })

  const mapped = items.map((item) => {
    const expired = item.endDate <= now
    const soon = !expired && item.endDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
    return {
      id: item.id,
      subscriptionId: item.subscriptionId,
      name: item.subscription.name,
      type: item.subscription.type,
      startDate: item.startDate,
      endDate: item.endDate,
      isActive: item.isActive && !expired,
      status: expired ? 'expired' : soon ? 'expiring' : 'active',
      lifetime: item.subscription.duration <= 0,
    }
  })

  const test = await testAvailability(req.userId)
  res.json({ subscriptions: mapped, test })
}

export async function getUserPurchases(req: AuthRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const items = await prisma.purchase.findMany({
    where: { userId: req.userId },
    include: { subscription: true, product: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  res.json({
    purchases: items.map((item) => ({
      id: item.id,
      amount: money(item.amount),
      status: item.status,
      createdAt: item.createdAt,
      completedAt: item.completedAt,
      name: item.subscription?.name || item.product?.name || 'Покупка',
      kind: item.subscriptionId ? 'subscription' : 'product',
    })),
  })
}

export async function cancelSubscription(req: AuthRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const item = await prisma.userSubscription.findFirst({
    where: { id: routeParam(req.params.id), userId: req.userId },
  })

  if (!item) {
    res.status(404).json({ message: 'Подписка не найдена' })
    return
  }

  const subscription = await prisma.subscription.findUnique({ where: { id: item.subscriptionId } })

  await prisma.userSubscription.update({
    where: { id: item.id },
    data: { isActive: false },
  })

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (user?.discordId && subscription?.discordRoleId) {
    const stillHas = await prisma.userSubscription.findFirst({
      where: {
        userId: req.userId,
        isActive: true,
        id: { not: item.id },
        subscriptionId: item.subscriptionId,
      },
    })
    if (!stillHas) {
      await removeRole(user.discordId, subscription.discordRoleId)
    }
  }

  res.json({ ok: true })
}

export async function checkTestSubscription(req: AuthRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }
  const test = await testAvailability(req.userId)
  res.json(test)
}

export async function activateTestSubscription(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }

    const test = await testAvailability(req.userId)
    if (!test.available) {
      res.status(400).json({ message: test.reason || 'Тестовая подписка недоступна' })
      return
    }

    let subscription = await prisma.subscription.findFirst({ where: { type: 'TEST' } })
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          name: 'Тестовая подписка',
          description: '1 день доступа раз в 3 месяца',
          price: 0,
          duration: 1,
          type: 'TEST',
          discordRoleId: '1541790489399791716',
          isActive: true,
        },
      })
    }

    await activateSubscription(req.userId, subscription.id)
    await prisma.user.update({
      where: { id: req.userId },
      data: { lastTestSubscriptionAt: new Date() },
    })

    res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось активировать тест'
    res.status(400).json({ message })
  }
}
