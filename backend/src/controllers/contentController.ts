import type { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { ROLE_MAPPING } from '../services/discordService'
import { AUTHOR_SELECT, NEWS_ORDER, publishedWhere, serializeNewsCard } from '../services/newsService'
import { getContentSettings } from '../services/siteContentService'

const ROLE_LABELS: Record<string, string> = {
  Owner: 'Owner',
  Developer: 'Developer',
  'Technical Administrator': 'Tech.Admin',
  Administrator: 'Admin',
  'Chief Moderator': 'Chief Mod.',
  Moderator: 'Mod.',
  Support: 'Media',
  Subscriber_Plus: 'Sub Pl',
  Subscriber: 'Sub',
  Default: 'Def.',
}

const ROLE_ICONS: Record<string, string> = {
  Owner: 'owner.png',
  Developer: 'developer.png',
  'Technical Administrator': 'technical_administrator.png',
  Administrator: 'administrator.png',
  'Chief Moderator': 'chief_moderator.png',
  Moderator: 'moderator.png',
  Support: 'support.png',
  Subscriber_Plus: 'subcriber_plus.png',
  Subscriber: 'subcriber.png',
}

const ROLE_ICON_BASE = 'https://cdn-files.aspectvisuals.su/assets/images/profile-assets/roles_icon'

/** Каталог ролей строится из ROLE_MAPPING, чтобы сайт и лаунчер показывали одинаковые названия и иконки. */
function rolesCatalog() {
  return Object.entries(ROLE_MAPPING).map(([discordId, name]) => ({
    discordId,
    name,
    label: ROLE_LABELS[name] || name,
    icon: ROLE_ICONS[name] ? `${ROLE_ICON_BASE}/${ROLE_ICONS[name]}` : null,
  }))
}

const NAV = [
  { id: 'home', label: 'Главная', group: 0 },
  { id: 'news', label: 'Новости', group: 0 },
  { id: 'shop', label: 'Магазин', group: 0 },
  { id: 'account', label: 'Аккаунт', group: 1 },
  { id: 'profile', label: 'Профиль', group: 1 },
  { id: 'balance', label: 'Баланс', group: 1 },
  { id: 'subscriptions', label: 'Подписки', group: 1 },
  { id: 'download', label: 'Скачать клиент', group: 1 },
  { id: 'settings', label: 'Настройки', group: 1 },
  { id: 'bonus', label: 'Ежедневный бонус', group: 2 },
  { id: 'configs', label: 'Конфиги', group: 2 },
  { id: 'cosmetics', label: 'Косметика', group: 2 },
  { id: 'support', label: 'Поддержка', group: 3 },
  { id: 'admin', label: 'Админ-панель', group: 3, admin: true },
]

/**
 * Единый бутстрап контента для лаунчера.
 * Все данные приходят из базы и системных настроек — без статических копий и разбора HTML сайта.
 */
export async function getSiteContent(_req: Request, res: Response) {
  try {
    const [news, subscriptions, products, configs, cosmetics, settings] = await Promise.all([
      prisma.news.findMany({
        where: publishedWhere(),
        include: { author: AUTHOR_SELECT },
        orderBy: [...NEWS_ORDER],
        take: 10,
      }),
      prisma.subscription.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { duration: 'asc' }],
      }),
      prisma.product.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } }),
      prisma.configPreset.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.cosmeticItem.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      getContentSettings(),
    ])

    res.json({
      home: settings.home,
      news: news.map(serializeNewsCard),
      roles: rolesCatalog(),
      configs: configs.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        fileUrl: item.fileUrl,
      })),
      cosmetics: cosmetics.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        previewUrl: item.previewUrl,
        status: item.status,
      })),
      download: settings.download,
      socials: settings.socials,
      support: settings.support,
      legal: settings.legal,
      shop: {
        subscriptions: subscriptions.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          duration: item.duration,
          type: item.type,
        })),
        products: products.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          type: item.type,
        })),
      },
      nav: NAV,
    })
  } catch (error) {
    console.error('Content error:', error)
    res.status(500).json({ message: 'Не удалось загрузить контент сайта' })
  }
}
