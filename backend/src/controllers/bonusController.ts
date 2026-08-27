import type { Response } from 'express'
import { prisma } from '../utils/prisma'
import type { AuthRequest } from '../middleware/auth'
import { activateSubscription } from './shopController'
import { getNumberSetting } from '../services/systemSettingsService'

interface DailyBonusState {
  available: boolean
  amount: number
  cooldownHours: number
  balance: number
  lastClaimedAt: string | null
  nextAvailableAt: string | null
  msUntilNext: number
}

async function dailyBonusState(userId: string): Promise<DailyBonusState> {
  const [amount, cooldownHours, user] = await Promise.all([
    getNumberSetting('dailyBonusAmount', 25),
    getNumberSetting('dailyBonusCooldownHours', 24),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balance: true, lastDailyBonusAt: true },
    }),
  ])

  const cooldownMs = cooldownHours * 60 * 60 * 1000
  const last = user.lastDailyBonusAt
  const nextAt = last ? new Date(last.getTime() + cooldownMs) : null
  const msUntilNext = nextAt ? Math.max(0, nextAt.getTime() - Date.now()) : 0

  return {
    available: msUntilNext === 0,
    amount,
    cooldownHours,
    balance: Number(user.balance),
    lastClaimedAt: last ? last.toISOString() : null,
    nextAvailableAt: nextAt ? nextAt.toISOString() : null,
    msUntilNext,
  }
}

export async function getDailyBonus(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }
    res.json(await dailyBonusState(req.userId))
  } catch (error) {
    console.error('Daily bonus state error:', error)
    res.status(500).json({ message: 'Не удалось получить состояние бонуса' })
  }
}

export async function claimDailyBonus(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ message: 'Нужна авторизация' })
      return
    }

    const [amount, cooldownHours] = await Promise.all([
      getNumberSetting('dailyBonusAmount', 25),
      getNumberSetting('dailyBonusCooldownHours', 24),
    ])

    if (amount <= 0) {
      res.status(400).json({ message: 'Ежедневный бонус сейчас отключён' })
      return
    }

    const now = new Date()
    const threshold = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000)

    const claimed = await prisma.$transaction(async (tx) => {
      // Условие cooldown внутри UPDATE ... WHERE делает выдачу атомарной:
      // параллельные запросы не смогут начислить бонус дважды
      const result = await tx.user.updateMany({
        where: {
          id: userId,
          OR: [{ lastDailyBonusAt: null }, { lastDailyBonusAt: { lte: threshold } }],
        },
        data: {
          lastDailyBonusAt: now,
          balance: { increment: amount },
        },
      })

      if (result.count === 0) return false

      await tx.balanceTransaction.create({
        data: {
          userId,
          amount,
          kind: 'DAILY_BONUS',
          note: 'Ежедневный бонус',
        },
      })

      return true
    })

    if (!claimed) {
      const state = await dailyBonusState(userId)
      res.status(429).json({ message: 'Бонус уже получен, приходите позже', ...state })
      return
    }

    const state = await dailyBonusState(userId)
    res.json({ ok: true, claimedAmount: amount, ...state })
  } catch (error) {
    console.error('Daily bonus claim error:', error)
    res.status(500).json({ message: 'Не удалось получить бонус' })
  }
}

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
  amount: unknown
  subscriptionType: string
  note: string | null
  folderId: string | null
  maxUses: number
  usedCount: number
  oncePerUser: boolean
  isActive: boolean
  validUntil: Date | null
}) {
  return { ...item, amount: Number(item.amount) }
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

    const amount = Number(bonus.amount)
    if (amount > 0) {
      const userId = req.userId
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: amount } },
        })
        await tx.balanceTransaction.create({
          data: {
            userId,
            amount,
            kind: 'BONUS_CODE',
            note: `Бонус-код ${bonus.code}`,
          },
        })
        await tx.bonusCodeUsed.create({ data: { userId, bonusCodeId: bonus.id } })
        await tx.bonusCode.update({ where: { id: bonus.id }, data: { usedCount: { increment: 1 } } })
      })
      res.json({ ok: true, amount, kind: 'BALANCE' })
      return
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
  const code = asString(req.body?.code).toUpperCase() || `BONUS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const amount = Math.max(0, Number(req.body?.amount) || 0)
  const days = Math.max(0, Number(req.body?.days) || 0)
  const subscriptionType = asString(req.body?.subscriptionType).toUpperCase() || (amount > 0 ? 'BALANCE' : 'BASIC')
  if (!code || (amount <= 0 && !days)) {
    res.status(400).json({ message: 'Укажите код и сумму на баланс или дни подписки' })
    return
  }

  try {
    const bonus = await prisma.bonusCode.create({
      data: {
        code,
        days,
        amount,
        subscriptionType,
        note: asString(req.body?.note) || null,
        folderId: asString(req.body?.folderId) || null,
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
      amount: req.body?.amount === undefined ? undefined : Number(req.body.amount) || 0,
      subscriptionType: asString(req.body?.subscriptionType) || existing.subscriptionType,
      note: req.body?.note === undefined ? undefined : asString(req.body.note) || null,
      folderId: req.body?.folderId === undefined ? undefined : asString(req.body.folderId) || null,
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
    include: { _count: { select: { usedBy: true } }, folder: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    bonusCodes: items.map((item) => ({
      ...serializeBonus(item),
      uses: item._count.usedBy,
      folder: item.folder,
    })),
  })
}
