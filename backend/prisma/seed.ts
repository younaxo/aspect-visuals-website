import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const roles = [
  { discordId: '1541875062208995328', name: 'Owner' },
  { discordId: '1541784961986596874', name: 'Developer' },
  { discordId: '1541875599331561604', name: 'Technical Administrator' },
  { discordId: '1541785126856429568', name: 'Administrator' },
  { discordId: '1541785097374793799', name: 'Chief Moderator' },
  { discordId: '1541785042706235472', name: 'Moderator' },
  { discordId: '1541785160297480243', name: 'Support' },
  { discordId: '1541875642524766290', name: 'Subscriber_Plus' },
  { discordId: '1541790489399791716', name: 'Subscriber' },
  { discordId: '1541869586004058264', name: 'Default' },
]

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { discordId: role.discordId },
      update: { name: role.name },
      create: role,
    })
  }

  await seedShop()
  await seedConfigs()
  await seedCosmetics()
  await seedNews()
}

const configPresets = [
  { name: 'FPS Boost', description: 'Лёгкий профиль под слабые ПК', sortOrder: 1 },
  { name: 'Cinematic', description: 'Максимум теней и объёма', sortOrder: 2 },
  { name: 'PvP Clean', description: 'Чистая картинка без лишнего', sortOrder: 3 },
]

const cosmeticItems = [
  { name: 'Mono Default', description: 'Базовое оформление клиента', status: 'AVAILABLE', sortOrder: 1 },
  { name: 'Carbon', description: 'Тёмное карбоновое оформление', status: 'SOON', sortOrder: 2 },
  { name: 'Ivory', description: 'Светлое оформление', status: 'SOON', sortOrder: 3 },
]

async function seedConfigs() {
  for (const item of configPresets) {
    const existing = await prisma.configPreset.findFirst({ where: { name: item.name } })
    if (existing) {
      await prisma.configPreset.update({ where: { id: existing.id }, data: item })
    } else {
      await prisma.configPreset.create({ data: item })
    }
  }
}

async function seedCosmetics() {
  for (const item of cosmeticItems) {
    const existing = await prisma.cosmeticItem.findFirst({ where: { name: item.name } })
    if (existing) {
      await prisma.cosmeticItem.update({ where: { id: existing.id }, data: item })
    } else {
      await prisma.cosmeticItem.create({ data: item })
    }
  }
}

// Стартовая новость, чтобы раздел не был пустым до первой публикации из админки
async function seedNews() {
  const slug = 'aspect-visuals-zapusk'
  const existing = await prisma.news.findUnique({ where: { slug } })
  if (existing) return

  await prisma.news.create({
    data: {
      title: 'Aspect Visuals',
      slug,
      excerpt: 'Клиент визуалов для Minecraft: вход по email, Discord, подписки и магазин.',
      content:
        'Aspect Visuals — клиент визуалов для Minecraft. Доступны вход по email и через Discord, ' +
        'синхронизация ролей, подписки, магазин и ежедневный бонус. ' +
        'Новости публикуются из административной панели.',
      status: 'PUBLISHED',
      pinned: true,
      publishedAt: new Date(),
    },
  })
}

const subscriptions = [
  {
    name: 'Базовая · 7 дней',
    description: 'Неделя доступа к базовым визуалам',
    price: 59,
    duration: 7,
    type: 'BASIC',
    discordRoleId: '1541790489399791716',
  },
  {
    name: 'Базовая · 14 дней',
    description: 'Две недели базового доступа',
    price: 129,
    duration: 14,
    type: 'BASIC',
    discordRoleId: '1541790489399791716',
  },
  {
    name: 'Базовая · 30 дней',
    description: 'Месяц базового доступа — самый популярный тариф',
    price: 199,
    duration: 30,
    type: 'BASIC',
    discordRoleId: '1541790489399791716',
  },
  {
    name: 'Базовая · 90 дней',
    description: 'Три месяца базового доступа',
    price: 299,
    duration: 90,
    type: 'BASIC',
    discordRoleId: '1541790489399791716',
  },
  {
    name: 'Базовая · 180 дней',
    description: 'Полгода базового доступа',
    price: 499,
    duration: 180,
    type: 'BASIC',
    discordRoleId: '1541790489399791716',
  },
  {
    name: 'Базовая · Навсегда',
    description: 'Бессрочный базовый доступ',
    price: 599,
    duration: 0,
    type: 'LIFETIME',
    discordRoleId: '1541790489399791716',
  },
  {
    name: 'Премиум · 30 дней',
    description: 'Месяц премиум-функций',
    price: 49,
    duration: 30,
    type: 'PREMIUM',
    discordRoleId: '1541875642524766290',
  },
  {
    name: 'Премиум · 90 дней',
    description: 'Три месяца премиум-функций',
    price: 139,
    duration: 90,
    type: 'PREMIUM',
    discordRoleId: '1541875642524766290',
  },
  {
    name: 'Премиум · Навсегда',
    description: 'Бессрочный премиум',
    price: 299,
    duration: 0,
    type: 'PREMIUM',
    discordRoleId: '1541875642524766290',
  },
  {
    name: 'Тестовая подписка',
    description: '1 день, раз в 3 месяца',
    price: 0,
    duration: 1,
    type: 'TEST',
    discordRoleId: '1541790489399791716',
  },
]

const products = [
  {
    name: 'Бета-тест',
    description: 'Участие в закрытом бета-тесте. Подарить нельзя.',
    price: 99,
    type: 'BETA',
    giftable: false,
  },
  {
    name: 'Сброс HWID',
    description: 'Сброс привязки оборудования. Подарить нельзя.',
    price: 139,
    type: 'HWID_RESET',
    giftable: false,
  },
]

async function seedShop() {
  for (const item of subscriptions) {
    const existing = await prisma.subscription.findFirst({
      where: { name: item.name },
    })
    if (existing) {
      await prisma.subscription.update({ where: { id: existing.id }, data: item })
    } else {
      await prisma.subscription.create({ data: item })
    }
  }

  for (const item of products) {
    const existing = await prisma.product.findFirst({ where: { type: item.type } })
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: item })
    } else {
      await prisma.product.create({ data: item })
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
