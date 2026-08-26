import type { UserSettings } from '@prisma/client'
import { prisma } from './prisma'

export async function ensureUserSettings(userId: string): Promise<UserSettings> {
  const existing = await prisma.userSettings.findUnique({ where: { userId } })
  if (existing) return existing

  try {
    return await prisma.userSettings.create({ data: { userId } })
  } catch {
    const created = await prisma.userSettings.findUnique({ where: { userId } })
    if (created) return created
    throw new Error('Не удалось создать настройки пользователя')
  }
}
