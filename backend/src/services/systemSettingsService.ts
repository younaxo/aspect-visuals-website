import { prisma } from '../utils/prisma'

/**
 * Единый источник истины для системных настроек.
 * Значение берётся из таблицы SystemSetting, при отсутствии строки — дефолт отсюда.
 */
export const DEFAULT_SETTINGS: Record<string, { value: unknown; description: string }> = {
  chatMaxLength: { value: 2000, description: 'Максимальная длина сообщения в чате' },
  testSubscriptionDays: { value: 90, description: 'Интервал тестовой подписки (дни)' },
  hwidResetPrice: { value: 139, description: 'Стоимость сброса HWID' },
  registrationEnabled: { value: true, description: 'Включить регистрацию' },
  discordLinkEnabled: { value: true, description: 'Включить привязку Discord' },
  currency: { value: 'RUB', description: 'Валюта' },
  notifyEmail: { value: '', description: 'Email для уведомлений' },
  dailyBonusAmount: { value: 25, description: 'Размер ежедневного бонуса (₽)' },
  dailyBonusCooldownHours: { value: 24, description: 'Интервал ежедневного бонуса (часы)' },
}

export function isKnownSetting(key: string): boolean {
  return key in DEFAULT_SETTINGS
}

async function readSetting(key: string): Promise<unknown> {
  const row = await prisma.systemSetting.findUnique({ where: { key } })
  return row ? row.value : DEFAULT_SETTINGS[key]?.value
}

/** Числовая настройка с защитой от повреждённого значения в БД. */
export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  try {
    const value = Number(await readSetting(key))
    return Number.isFinite(value) && value >= 0 ? value : fallback
  } catch {
    return fallback
  }
}
