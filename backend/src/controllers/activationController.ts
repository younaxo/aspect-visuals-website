import type { Response } from 'express'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from '../middleware/auth'
import { activateSubscription } from './shopController'
import { generateBatch, maskKey, normalizeKey, validateKey } from '../utils/generateKeys'

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

function serializeKey(
  item: {
    id: string
    key: string
    isUsed: boolean
    usedAt: Date | null
    expiresAt: Date | null
    durationDays: number | null
    note?: string | null
    folderId?: string | null
    createdAt: Date
    product: { id: string; name: string } | null
    subscription: { id: string; name: string } | null
    batchId: string | null
  },
  reveal: boolean,
) {
  return {
    id: item.id,
    key: reveal && !item.isUsed ? item.key : maskKey(item.key),
    fullKey: reveal ? item.key : undefined,
    isUsed: item.isUsed,
    usedAt: item.usedAt,
    expiresAt: item.expiresAt,
    durationDays: item.durationDays,
    note: item.note ?? null,
    folderId: item.folderId ?? null,
    createdAt: item.createdAt,
    batchId: item.batchId,
    product: item.product,
    subscription: item.subscription,
    itemName: item.subscription?.name || item.product?.name || 'Товар',
  }
}

export async function generateKeys(req: AuthRequest, res: Response) {
  const productId = asString(req.body?.productId) || null
  let subscriptionId = asString(req.body?.subscriptionId) || null
  const subscriptionType = asString(req.body?.subscriptionType).toUpperCase()
  const count = Math.min(200, Math.max(1, Number(req.body?.count) || 1))
  const name = asString(req.body?.name) || `Пачка ${new Date().toISOString().slice(0, 10)}`
  const expiresAt = asDate(req.body?.expiresAt)
  const durationRaw = req.body?.durationDays
  const durationDays =
    durationRaw === '' || durationRaw === null || durationRaw === undefined
      ? null
      : Math.max(0, Number(durationRaw) || 0)

  if (!productId && !subscriptionId && (subscriptionType === 'BASIC' || subscriptionType === 'PREMIUM')) {
    const sub = await prisma.subscription.findFirst({
      where: { type: subscriptionType, isActive: true },
      orderBy: { duration: 'asc' },
    })
    subscriptionId = sub?.id ?? null
  }

  if (!productId && !subscriptionId) {
    res.status(400).json({ message: 'Выберите товар или тип подписки' })
    return
  }

  if (subscriptionId && durationDays == null) {
    res.status(400).json({ message: 'Укажите срок действия подписки в днях (0 — навсегда)' })
    return
  }

  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      res.status(400).json({ message: 'Товар не найден' })
      return
    }
  }
  if (subscriptionId) {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
    if (!subscription) {
      res.status(400).json({ message: 'Подписка не найдена' })
      return
    }
  }

  const batch = await prisma.activationBatch.create({
    data: {
      name,
      productId,
      subscriptionId,
      count,
      generatedBy: req.userId,
    },
  })

  const codes = generateBatch(count)
  const created = []
  for (const key of codes) {
    const row = await prisma.activationKey.create({
      data: {
        key,
        productId,
        subscriptionId,
        generatedBy: req.userId,
        expiresAt,
        durationDays,
        note: asString(req.body?.note) || null,
        folderId: asString(req.body?.folderId) || null,
        batchId: batch.id,
      },
      include: { product: true, subscription: true },
    })
    created.push(row)
  }

  res.status(201).json({
    batch: { id: batch.id, name: batch.name, count: created.length },
    keys: created.map((item) => serializeKey(item, true)),
  })
}

export async function activateKey(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }

    const raw = normalizeKey(asString(req.body?.key))
    if (!validateKey(raw)) {
      res.status(400).json({ message: 'Неверный формат ключа' })
      return
    }

    const key = await prisma.activationKey.findUnique({
      where: { key: raw },
      include: { product: true, subscription: true },
    })

    if (!key) {
      res.status(400).json({ message: 'Ключ не найден' })
      return
    }
    if (key.isUsed) {
      res.status(400).json({ message: 'Ключ уже использован' })
      return
    }
    if (key.expiresAt && key.expiresAt < new Date()) {
      res.status(400).json({ message: 'Срок действия ключа истёк' })
      return
    }

    if (key.subscriptionId) {
      await activateSubscription(req.userId, key.subscriptionId, key.durationDays)
    }

    if (key.productId) {
      await prisma.purchase.create({
        data: {
          userId: req.userId,
          productId: key.productId,
          amount: 0,
          status: 'COMPLETED',
          paymentMethod: 'activation-key',
          completedAt: new Date(),
        },
      })
    }

    const updated = await prisma.activationKey.update({
      where: { id: key.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        activatedById: req.userId,
      },
      include: { product: true, subscription: true },
    })

    res.json({
      ok: true,
      itemName: updated.subscription?.name || updated.product?.name || 'Товар',
      key: serializeKey(updated, false),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось активировать ключ'
    res.status(400).json({ message })
  }
}

export async function checkKey(req: AuthRequest, res: Response) {
  const raw = normalizeKey(asString(req.body?.key))
  if (!validateKey(raw)) {
    res.status(400).json({ message: 'Неверный формат ключа', valid: false })
    return
  }

  const key = await prisma.activationKey.findUnique({
    where: { key: raw },
    include: { product: true, subscription: true },
  })

  if (!key) {
    res.json({ valid: false, message: 'Ключ не найден' })
    return
  }

  res.json({
    valid: !key.isUsed && (!key.expiresAt || key.expiresAt > new Date()),
    isUsed: key.isUsed,
    expired: Boolean(key.expiresAt && key.expiresAt < new Date()),
    itemName: key.subscription?.name || key.product?.name || 'Товар',
  })
}

export async function getMyKeys(req: AuthRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({ message: 'Нужна авторизация' })
    return
  }

  const items = await prisma.activationKey.findMany({
    where: { activatedById: req.userId },
    include: { product: true, subscription: true },
    orderBy: { usedAt: 'desc' },
  })

  res.json({ keys: items.map((item) => serializeKey(item, false)) })
}

export async function getKeys(_req: AuthRequest, res: Response) {
  const items = await prisma.activationKey.findMany({
    include: { product: true, subscription: true, folder: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const used = items.filter((item) => item.isUsed).length
  res.json({
    keys: items.map((item) => serializeKey(item, true)),
    stats: {
      total: items.length,
      used,
      remaining: items.length - used,
    },
  })
}

export async function getKeyInfo(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const item = await prisma.activationKey.findUnique({
    where: { id },
    include: { product: true, subscription: true },
  })
  if (!item) {
    res.status(404).json({ message: 'Ключ не найден' })
    return
  }
  res.json({ key: serializeKey(item, true) })
}

export async function deleteKey(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const item = await prisma.activationKey.findUnique({ where: { id } })
  if (!item) {
    res.status(404).json({ message: 'Ключ не найден' })
    return
  }
  if (item.isUsed) {
    res.status(400).json({ message: 'Использованный ключ нельзя удалить' })
    return
  }
  await prisma.activationKey.delete({ where: { id } })
  res.json({ ok: true })
}

export async function getBatchKeys(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const batch = await prisma.activationBatch.findUnique({
    where: { id },
    include: {
      keys: { include: { product: true, subscription: true } },
      product: true,
      subscription: true,
    },
  })
  if (!batch) {
    res.status(404).json({ message: 'Пачка не найдена' })
    return
  }
  res.json({
    batch: {
      id: batch.id,
      name: batch.name,
      count: batch.count,
      product: batch.product,
      subscription: batch.subscription,
    },
    keys: batch.keys.map((item) => serializeKey(item, true)),
  })
}
