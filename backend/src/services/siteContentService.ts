import { prisma } from '../utils/prisma'

/**
 * Одиночные блоки контента сайта (главная, ссылки, поддержка, юридические документы).
 * Значения хранятся в SystemSetting и могут меняться без релиза;
 * константы ниже — только дефолт для пустой базы.
 */

export interface HomeContent {
  eyebrow: string
  title: string
  text: string
  features: Array<{ title: string; text: string }>
}

export interface DownloadContent {
  url: string
  steps: Array<{ title: string; text: string }>
}

export interface SocialLink {
  label: string
  url: string
}

export interface SupportContent {
  email: string
  text: string
}

export interface LegalLink {
  slug: string
  title: string
  url: string
}

export const CONTENT_KEYS = {
  home: 'contentHome',
  download: 'contentDownload',
  socials: 'contentSocials',
  support: 'contentSupport',
  legal: 'contentLegal',
} as const

const SITE_URL = (process.env.FRONTEND_URL || 'https://aspectvisuals.su').replace(/\/$/, '')

const DEFAULT_HOME: HomeContent = {
  eyebrow: 'Minecraft',
  title: 'Aspect Visuals',
  text: 'Клиент визуалов для Minecraft: вход по email, Discord, подписки и магазин.',
  features: [
    { title: 'Подписки', text: 'Базовый и премиум доступ к визуалам Minecraft, ключи и тестовый день раз в три месяца.' },
    { title: 'Discord', text: 'Вход через Discord и синхронизация ролей сервера с аккаунтом на сайте.' },
    { title: 'Магазин', text: 'Пакеты, допы и промокоды — без лишнего шума, только нужные покупки.' },
  ],
}

const DEFAULT_DOWNLOAD: DownloadContent = {
  url: 'https://cdn-files.aspectvisuals.su/launcher/AspectVisualsSetup.exe',
  steps: [
    {
      title: 'Скачайте и запустите лаунчер',
      text: 'Нажмите кнопку «Скачать лаунчер» и сохраните файл. При первом запуске все необходимые файлы скачаются автоматически.',
    },
    { title: 'Войдите в аккаунт', text: 'Авторизуйтесь в свой аккаунт Aspect — тот же, что на сайте.' },
    { title: 'Выберите версию и играйте', text: 'Введите никнейм, выберите нужную версию Minecraft и нажмите Play.' },
  ],
}

const DEFAULT_SOCIALS: SocialLink[] = [
  { label: 'Discord', url: 'https://discord.gg/aspectvisuals' },
  { label: 'Telegram', url: 'https://t.me/aspectvisuals' },
  { label: 'YouTube', url: 'https://youtube.com/@aspectvisuals' },
  { label: 'TikTok', url: 'https://www.tiktok.com/@aspectvisuals' },
]

const DEFAULT_SUPPORT: SupportContent = {
  email: 'support@aspectvisuals.su',
  text: 'Напишите в чат или на support@aspectvisuals.su.',
}

const DEFAULT_LEGAL: LegalLink[] = [
  { slug: 'privacy', title: 'Политика конфиденциальности', url: `${SITE_URL}/privacy` },
  { slug: 'terms', title: 'Пользовательское соглашение', url: `${SITE_URL}/terms` },
  { slug: 'legal', title: 'Юридическая информация', url: `${SITE_URL}/legal` },
  { slug: 'refund', title: 'Политика возвратов', url: `${SITE_URL}/refund` },
]

export interface SiteContentSettings {
  home: HomeContent
  download: DownloadContent
  socials: SocialLink[]
  support: SupportContent
  legal: LegalLink[]
}

function pick<T>(rows: Map<string, unknown>, key: string, fallback: T): T {
  const value = rows.get(key)
  // Повреждённое или пустое значение в БД не должно ломать выдачу контента
  if (value === undefined || value === null) return fallback
  if (Array.isArray(fallback) && !Array.isArray(value)) return fallback
  if (!Array.isArray(fallback) && typeof value !== 'object') return fallback
  return value as T
}

export async function getContentSettings(): Promise<SiteContentSettings> {
  const keys = Object.values(CONTENT_KEYS)
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: [...keys] } } })
  const map = new Map<string, unknown>(rows.map((row) => [row.key, row.value]))

  return {
    home: pick(map, CONTENT_KEYS.home, DEFAULT_HOME),
    download: pick(map, CONTENT_KEYS.download, DEFAULT_DOWNLOAD),
    socials: pick(map, CONTENT_KEYS.socials, DEFAULT_SOCIALS),
    support: pick(map, CONTENT_KEYS.support, DEFAULT_SUPPORT),
    legal: pick(map, CONTENT_KEYS.legal, DEFAULT_LEGAL),
  }
}
