import type { Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from '../middleware/auth'
import { logAdminRequest } from '../middleware/logging'
import { generateBatch } from '../utils/generateKeys'
import { toPublicUser } from '../utils/user'
import { DEFAULT_SETTINGS, isKnownSetting } from '../services/systemSettingsService'

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

function money(value: Prisma.Decimal | number | string): number {
  return Number(value)
}

async function log(req: AuthRequest, action: string, targetType: string, targetId?: string, details?: unknown) {
  await logAdminRequest(req, action, targetType, targetId, details)
}

export async function getDashboardStats(_req: AuthRequest, res: Response) {
  const now = new Date()
  const monthAgo = new Date(now)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const [
    totalUsers,
    newUsers,
    activeSubs,
    purchasesMonth,
    purchasesAll,
    lastLogs,
    salesByDayRaw,
    subTypes,
    popularProducts,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false, createdAt: { gte: monthAgo } } }),
    prisma.userSubscription.count({ where: { isActive: true, endDate: { gt: now } } }),
    prisma.purchase.aggregate({
      where: { status: 'COMPLETED', completedAt: { gte: monthAgo } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.purchase.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.adminLog.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, username: true } } },
    }),
    prisma.purchase.findMany({
      where: { status: 'COMPLETED', completedAt: { gte: monthAgo } },
      select: { amount: true, completedAt: true, createdAt: true },
    }),
    prisma.userSubscription.groupBy({
      by: ['subscriptionId'],
      where: { isActive: true, endDate: { gt: now } },
      _count: true,
    }),
    prisma.purchase.groupBy({
      by: ['productId'],
      where: { status: 'COMPLETED', productId: { not: null } },
      _count: true,
      orderBy: { _count: { productId: 'desc' } },
      take: 6,
    }),
  ])

  const dayMap = new Map<string, { date: string; amount: number; count: number }>()
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, { date: key, amount: 0, count: 0 })
  }
  for (const row of salesByDayRaw) {
    const key = (row.completedAt ?? row.createdAt).toISOString().slice(0, 10)
    const bucket = dayMap.get(key)
    if (bucket) {
      bucket.amount += money(row.amount)
      bucket.count += 1
    }
  }

  const subIds = subTypes.map((item) => item.subscriptionId)
  const subs = await prisma.subscription.findMany({ where: { id: { in: subIds } } })
  const subName = new Map(subs.map((item) => [item.id, item.name]))

  const productIds = popularProducts.map((item) => item.productId).filter(Boolean) as string[]
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
  const productName = new Map(products.map((item) => [item.id, item.name]))

  res.json({
    stats: {
      totalUsers,
      newUsers,
      activeSubscriptions: activeSubs,
      revenueMonth: money(purchasesMonth._sum.amount ?? 0),
      revenueAll: money(purchasesAll._sum.amount ?? 0),
      purchasesMonth: purchasesMonth._count,
      purchasesAll: purchasesAll._count,
    },
    salesByDay: [...dayMap.values()],
    subscriptionSplit: subTypes.map((item) => ({
      name: subName.get(item.subscriptionId) || 'Подписка',
      value: item._count,
    })),
    popularProducts: popularProducts.map((item) => ({
      name: productName.get(item.productId || '') || 'Товар',
      value: item._count,
    })),
    recentLogs: lastLogs,
  })
}

export async function getUsers(req: AuthRequest, res: Response) {
  const page = Math.max(1, asNumber(req.query.page, 1) ?? 1)
  const pageSize = Math.min(50, Math.max(10, asNumber(req.query.pageSize, 20) ?? 20))
  const q = asString(req.query.q)
  const role = asString(req.query.role)
  const status = asString(req.query.status)

  const where: Prisma.UserWhereInput = {
    isDeleted: status === 'deleted' ? true : false,
  }
  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { discordId: { contains: q } },
    ]
  }
  if (role) {
    where.roles = { some: { discordId: role } }
  }
  if (status === 'banned') {
    where.ban = { isNot: null }
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        roles: true,
        ban: true,
        userSubscriptions: { where: { isActive: true }, include: { subscription: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  res.json({
    total,
    page,
    pageSize,
    users: users.map((user) => ({
      ...toPublicUser(user),
      balance: money(user.balance),
      isDeleted: user.isDeleted,
      banned: Boolean(user.ban),
      ban: user.ban,
      subscriptions: user.userSubscriptions.map((item) => ({
        id: item.id,
        name: item.subscription.name,
        endDate: item.endDate,
      })),
    })),
  })
}

export async function getUserById(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: true,
      ban: true,
      userSubscriptions: { include: { subscription: true } },
      purchases: { orderBy: { createdAt: 'desc' }, take: 30 },
    },
  })
  if (!user) {
    res.status(404).json({ message: 'Пользователь не найден' })
    return
  }
  res.json({
    user: {
      ...toPublicUser(user),
      balance: money(user.balance),
      isDeleted: user.isDeleted,
      banned: Boolean(user.ban),
      ban: user.ban,
      subscriptions: user.userSubscriptions,
      purchases: user.purchases,
    },
  })
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const discordIds = Array.isArray(req.body?.roleIds)
    ? (req.body.roleIds as unknown[]).map((item) => String(item))
    : [asString(req.body?.roleId)].filter(Boolean)

  const roles = await prisma.role.findMany({ where: { discordId: { in: discordIds } } })
  if (!roles.length) {
    res.status(400).json({ message: 'Укажите роли' })
    return
  }

  const user = await prisma.user.update({
    where: { id },
    data: { roles: { set: roles.map((role) => ({ id: role.id })) } },
    include: { roles: true },
  })
  await log(req, 'UPDATE', 'USER', id, { roles: discordIds })
  res.json({ user: toPublicUser(user) })
}

export async function banUser(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const reason = asString(req.body?.reason) || null
  const expiresAt = asDate(req.body?.expiresAt)
  const isPermanent = req.body?.isPermanent !== false && !expiresAt

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    res.status(404).json({ message: 'Пользователь не найден' })
    return
  }

  const ban = await prisma.ban.upsert({
    where: { userId: id },
    update: { reason, expiresAt, isPermanent, bannedBy: req.userId! },
    create: { userId: id, bannedBy: req.userId!, reason, expiresAt, isPermanent },
  })
  await prisma.session.deleteMany({ where: { userId: id } })
  await log(req, 'BAN', 'USER', id, { reason, isPermanent })
  res.json({ ban })
}

export async function unbanUser(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  await prisma.ban.deleteMany({ where: { userId: id } })
  await log(req, 'UNBAN', 'USER', id)
  res.json({ ok: true })
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  await prisma.user.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), email: null, password: null },
  })
  await prisma.session.deleteMany({ where: { userId: id } })
  await log(req, 'DELETE', 'USER', id)
  res.json({ ok: true })
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
  return { ...item, price: money(item.price) }
}

export async function getSubscriptions(_req: AuthRequest, res: Response) {
  const items = await prisma.subscription.findMany({ orderBy: [{ type: 'asc' }, { duration: 'asc' }] })
  res.json({ subscriptions: items.map(serializeSub) })
}

export async function createSubscription(req: AuthRequest, res: Response) {
  const name = asString(req.body?.name)
  const price = asNumber(req.body?.price)
  const duration = asNumber(req.body?.duration, 0) ?? 0
  const type = asString(req.body?.type).toUpperCase() || 'BASIC'
  if (!name || price == null) {
    res.status(400).json({ message: 'Укажите название и цену' })
    return
  }
  const item = await prisma.subscription.create({
    data: {
      name,
      description: asString(req.body?.description) || null,
      price,
      duration,
      type,
      discordRoleId: asString(req.body?.discordRoleId) || null,
      isActive: req.body?.isActive !== false,
    },
  })
  await log(req, 'CREATE', 'SUBSCRIPTION', item.id, { name })
  res.status(201).json({ subscription: serializeSub(item) })
}

export async function updateSubscription(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const existing = await prisma.subscription.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ message: 'Подписка не найдена' })
    return
  }
  const item = await prisma.subscription.update({
    where: { id },
    data: {
      name: asString(req.body?.name) || existing.name,
      description: req.body?.description === undefined ? undefined : asString(req.body.description) || null,
      price: asNumber(req.body?.price, money(existing.price)) ?? money(existing.price),
      duration: asNumber(req.body?.duration, existing.duration) ?? existing.duration,
      type: asString(req.body?.type) || existing.type,
      discordRoleId: req.body?.discordRoleId === undefined ? undefined : asString(req.body.discordRoleId) || null,
      isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
    },
  })
  await log(req, 'UPDATE', 'SUBSCRIPTION', id)
  res.json({ subscription: serializeSub(item) })
}

export async function deleteSubscription(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  await prisma.subscription.update({ where: { id }, data: { isActive: false } })
  await log(req, 'DELETE', 'SUBSCRIPTION', id)
  res.json({ ok: true })
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

export async function getProducts(_req: AuthRequest, res: Response) {
  const items = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({ products: items.map(serializeProduct) })
}

export async function createProduct(req: AuthRequest, res: Response) {
  const name = asString(req.body?.name)
  const price = asNumber(req.body?.price)
  const type = asString(req.body?.type).toUpperCase() || 'OTHER'
  if (!name || price == null) {
    res.status(400).json({ message: 'Укажите название и цену' })
    return
  }
  const item = await prisma.product.create({
    data: {
      name,
      description: asString(req.body?.description) || null,
      price,
      type,
      giftable: req.body?.giftable !== false,
      isActive: req.body?.isActive !== false,
    },
  })
  await log(req, 'CREATE', 'PRODUCT', item.id)
  res.status(201).json({ product: serializeProduct(item) })
}

export async function updateProduct(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ message: 'Товар не найден' })
    return
  }
  const item = await prisma.product.update({
    where: { id },
    data: {
      name: asString(req.body?.name) || existing.name,
      description: req.body?.description === undefined ? undefined : asString(req.body.description) || null,
      price: asNumber(req.body?.price, money(existing.price)) ?? money(existing.price),
      type: asString(req.body?.type) || existing.type,
      giftable: typeof req.body?.giftable === 'boolean' ? req.body.giftable : undefined,
      isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
    },
  })
  await log(req, 'UPDATE', 'PRODUCT', id)
  res.json({ product: serializeProduct(item) })
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  await prisma.product.update({ where: { id }, data: { isActive: false } })
  await log(req, 'DELETE', 'PRODUCT', id)
  res.json({ ok: true })
}

export async function getFolders(req: AuthRequest, res: Response) {
  const kind = asString(req.query.kind)
  const folders = await prisma.codeFolder.findMany({
    where: kind ? { kind } : undefined,
    orderBy: { name: 'asc' },
  })
  res.json({ folders })
}

export async function createFolder(req: AuthRequest, res: Response) {
  const name = asString(req.body?.name)
  const kind = asString(req.body?.kind).toUpperCase()
  if (!name || !['PROMO', 'BONUS', 'KEY'].includes(kind)) {
    res.status(400).json({ message: 'Укажите название и тип папки' })
    return
  }
  const folder = await prisma.codeFolder.create({ data: { name, kind } })
  await log(req, 'CREATE', 'FOLDER', folder.id, { name, kind })
  res.status(201).json({ folder })
}

export async function updateFolder(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const name = asString(req.body?.name)
  if (!name) {
    res.status(400).json({ message: 'Укажите название' })
    return
  }
  const folder = await prisma.codeFolder.update({ where: { id }, data: { name } })
  res.json({ folder })
}

export async function deleteFolder(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  await prisma.promoCode.updateMany({ where: { folderId: id }, data: { folderId: null } })
  await prisma.bonusCode.updateMany({ where: { folderId: id }, data: { folderId: null } })
  await prisma.activationKey.updateMany({ where: { folderId: id }, data: { folderId: null } })
  await prisma.codeFolder.delete({ where: { id } })
  await log(req, 'DELETE', 'FOLDER', id)
  res.json({ ok: true })
}

export async function getPurchaseHistory(req: AuthRequest, res: Response) {
  const page = Math.max(1, asNumber(req.query.page, 1) ?? 1)
  const pageSize = Math.min(50, Math.max(10, asNumber(req.query.pageSize, 20) ?? 20))
  const status = asString(req.query.status)
  const userId = asString(req.query.userId)
  const from = asDate(req.query.from)
  const to = asDate(req.query.to)

  const where: Prisma.PurchaseWhereInput = {}
  if (status) where.status = status
  if (userId) where.userId = userId
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }

  const [total, purchases] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true } },
        product: true,
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  res.json({
    total,
    page,
    pageSize,
    purchases: purchases.map((item) => ({
      ...item,
      amount: money(item.amount),
      name: item.subscription?.name || item.product?.name || 'Покупка',
    })),
  })
}

export async function refundPurchase(req: AuthRequest, res: Response) {
  const id = routeParam(req.params.id)
  const purchase = await prisma.purchase.findUnique({ where: { id } })
  if (!purchase) {
    res.status(404).json({ message: 'Покупка не найдена' })
    return
  }
  if (purchase.status === 'REFUNDED') {
    res.status(400).json({ message: 'Возврат уже выполнен' })
    return
  }
  const updated = await prisma.purchase.update({
    where: { id },
    data: { status: 'REFUNDED' },
  })
  await log(req, 'REFUND', 'PURCHASE', id, { amount: money(purchase.amount) })
  res.json({ purchase: { ...updated, amount: money(updated.amount) } })
}

export async function getAdminLogs(req: AuthRequest, res: Response) {
  const page = Math.max(1, asNumber(req.query.page, 1) ?? 1)
  const pageSize = Math.min(50, Math.max(10, asNumber(req.query.pageSize, 20) ?? 20))
  const action = asString(req.query.action)
  const adminId = asString(req.query.adminId)
  const q = asString(req.query.q)
  const from = asDate(req.query.from)
  const to = asDate(req.query.to)

  const where: Prisma.AdminLogWhereInput = {}
  if (action) where.action = action
  if (adminId) where.adminId = adminId
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }
  if (q) {
    where.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { targetType: { contains: q, mode: 'insensitive' } },
      { targetId: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [total, logs] = await Promise.all([
    prisma.adminLog.count({ where }),
    prisma.adminLog.findMany({
      where,
      include: { admin: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  res.json({ total, page, pageSize, logs })
}

export async function getSystemSettings(_req: AuthRequest, res: Response) {
  const rows = await prisma.systemSetting.findMany()
  const map = new Map(rows.map((row) => [row.key, row]))
  const settings = Object.entries(DEFAULT_SETTINGS).map(([key, meta]) => {
    const row = map.get(key)
    return {
      key,
      value: row ? row.value : meta.value,
      description: row?.description || meta.description,
      updatedAt: row?.updatedAt ?? null,
    }
  })
  res.json({ settings })
}

export async function updateSystemSettings(req: AuthRequest, res: Response) {
  const payload = req.body?.settings
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ message: 'Укажите настройки' })
    return
  }
  const entries = Object.entries(payload as Record<string, unknown>)
  for (const [key, value] of entries) {
    if (!isKnownSetting(key)) continue
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as Prisma.InputJsonValue, updatedBy: req.userId },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
        description: DEFAULT_SETTINGS[key].description,
        updatedBy: req.userId,
      },
    })
  }
  await log(req, 'UPDATE', 'SETTINGS', undefined, { keys: entries.map(([key]) => key) })
  await getSystemSettings(req, res)
}

export async function generateAdminKeys(req: AuthRequest, res: Response) {
  const productId = asString(req.body?.productId) || null
  const subscriptionType = asString(req.body?.subscriptionType).toUpperCase()
  const count = Math.min(200, Math.max(1, Number(req.body?.count) || 1))
  const note = asString(req.body?.note) || null
  const folderId = asString(req.body?.folderId) || null
  const expiresAt = asDate(req.body?.expiresAt)
  const durationDays =
    req.body?.durationDays === '' || req.body?.durationDays == null
      ? null
      : Math.max(0, Number(req.body.durationDays) || 0)

  let subscriptionId = asString(req.body?.subscriptionId) || null
  if (!productId && subscriptionType && !subscriptionId) {
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
    res.status(400).json({ message: 'Укажите срок в днях (0 — навсегда)' })
    return
  }

  const batch = await prisma.activationBatch.create({
    data: {
      name: asString(req.body?.name) || `Пачка ${new Date().toISOString().slice(0, 10)}`,
      productId,
      subscriptionId,
      count,
      generatedBy: req.userId,
    },
  })

  const codes = generateBatch(count)
  const created = []
  for (const key of codes) {
    created.push(
      await prisma.activationKey.create({
        data: {
          key,
          productId,
          subscriptionId,
          generatedBy: req.userId,
          expiresAt,
          durationDays,
          note,
          folderId,
          batchId: batch.id,
        },
        include: { product: true, subscription: true, folder: true },
      }),
    )
  }
  await log(req, 'CREATE', 'KEY', batch.id, { count })
  res.status(201).json({
    batch: { id: batch.id, name: batch.name, count: created.length },
    keys: created.map((item) => ({
      ...item,
      fullKey: item.key,
      itemName: item.subscription?.name || item.product?.name || 'Товар',
    })),
  })
}
