import { prisma } from '../utils/prisma'
import { canAccessChannel, isAdminRoles, isChatChannel, isStaffRoles } from '../utils/roles'

const PAGE_SIZE = 50

async function roleIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  })
  return user?.roles.map((role) => role.discordId) ?? []
}

async function assertChannel(userId: string, channel: string) {
  if (!isChatChannel(channel)) {
    throw new Error('Неизвестный канал')
  }
  const roles = await roleIds(userId)
  if (!canAccessChannel(roles, channel)) {
    throw new Error('Нет доступа к каналу')
  }
  return channel
}

function serializeUser(user: {
  id: string
  username: string
  avatar: string | null
  discordId: string | null
  status: string
  roles: { id: string; discordId: string; name: string }[]
}) {
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    discordId: user.discordId,
    status: user.status,
    roles: user.roles,
  }
}

function serializeMessage(message: {
  id: string
  content: string
  userId: string
  channel: string
  parentId: string | null
  isPinned: boolean
  isEdited: boolean
  isDeleted: boolean
  editedAt: Date | null
  createdAt: Date
  user: {
    id: string
    username: string
    avatar: string | null
    discordId: string | null
    status: string
    roles: { id: string; discordId: string; name: string }[]
  }
  reactions: Array<{ id: string; emoji: string; userId: string }>
  replies?: Array<{ id: string }>
}) {
  const content = message.isDeleted ? '' : message.content
  const grouped = new Map<string, string[]>()
  for (const reaction of message.reactions) {
    const list = grouped.get(reaction.emoji) ?? []
    list.push(reaction.userId)
    grouped.set(reaction.emoji, list)
  }

  return {
    id: message.id,
    content,
    userId: message.userId,
    channel: message.channel,
    parentId: message.parentId,
    isPinned: message.isPinned,
    isEdited: message.isEdited,
    isDeleted: message.isDeleted,
    editedAt: message.editedAt,
    createdAt: message.createdAt,
    user: serializeUser(message.user),
    replyCount: message.replies?.length ?? 0,
    reactions: [...grouped.entries()].map(([emoji, userIds]) => ({ emoji, userIds, count: userIds.length })),
  }
}

const messageInclude = {
  user: { include: { roles: true } },
  reactions: true,
  replies: { select: { id: true } },
} as const

export async function getMessages(userId: string, channel: string, before?: string) {
  await assertChannel(userId, channel)

  const beforeMessage = before
    ? await prisma.message.findUnique({ where: { id: before } })
    : null

  const items = await prisma.message.findMany({
    where: {
      channel,
      parentId: null,
      ...(beforeMessage ? { createdAt: { lt: beforeMessage.createdAt } } : {}),
    },
    include: messageInclude,
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
  })

  return items.reverse().map(serializeMessage)
}

export async function sendMessage(
  userId: string,
  data: { content: string; channel: string; parentId?: string | null },
) {
  const channel = await assertChannel(userId, data.channel)
  const content = data.content.trim().slice(0, 4000)
  if (!content) {
    throw new Error('Сообщение пустое')
  }

  if (data.parentId) {
    const parent = await prisma.message.findUnique({ where: { id: data.parentId } })
    if (!parent || parent.channel !== channel || parent.isDeleted) {
      throw new Error('Сообщение для ответа не найдено')
    }
  }

  const created = await prisma.message.create({
    data: {
      content,
      userId,
      channel,
      parentId: data.parentId || null,
    },
    include: messageInclude,
  })

  return serializeMessage(created)
}

export async function editMessage(messageId: string, content: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message || message.isDeleted) {
    throw new Error('Сообщение не найдено')
  }
  if (message.userId !== userId) {
    throw new Error('Можно редактировать только свои сообщения')
  }
  const next = content.trim().slice(0, 4000)
  if (!next) {
    throw new Error('Сообщение пустое')
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: next, isEdited: true, editedAt: new Date() },
    include: messageInclude,
  })
  return serializeMessage(updated)
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { user: { include: { roles: true } } },
  })
  if (!message) {
    throw new Error('Сообщение не найдено')
  }

  const roles = await roleIds(userId)
  const canModerate = isStaffRoles(roles)
  if (message.userId !== userId && !canModerate) {
    throw new Error('Недостаточно прав для удаления')
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, content: '' },
    include: messageInclude,
  })
  return serializeMessage(updated)
}

export async function addReaction(messageId: string, userId: string, emoji: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message || message.isDeleted) {
    throw new Error('Сообщение не найдено')
  }
  await assertChannel(userId, message.channel)

  const safe = emoji.trim().slice(0, 32)
  if (!safe) throw new Error('Укажите эмодзи')

  await prisma.messageReaction.upsert({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji: safe },
    },
    update: {},
    create: { messageId, userId, emoji: safe },
  })

  return { messageId, emoji: safe, userId, channel: message.channel }
}

export async function removeReaction(messageId: string, userId: string, emoji: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message) {
    throw new Error('Сообщение не найдено')
  }

  await prisma.messageReaction.deleteMany({
    where: { messageId, userId, emoji },
  })
  return { messageId, emoji, userId, channel: message.channel }
}

export async function pinMessage(messageId: string, userId: string, pinned: boolean) {
  const roles = await roleIds(userId)
  if (!isAdminRoles(roles)) {
    throw new Error('Закреплять сообщения могут только администраторы')
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message || message.isDeleted) {
    throw new Error('Сообщение не найдено')
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { isPinned: pinned },
    include: messageInclude,
  })
  return serializeMessage(updated)
}

export async function getOnlineUsers(userId: string) {
  await roleIds(userId)
  const items = await prisma.chatUser.findMany({
    where: { isOnline: true },
    include: { user: { include: { roles: true } } },
    orderBy: { lastSeen: 'desc' },
    take: 100,
  })
  return items.map((item) => ({
    ...serializeUser(item.user),
    lastSeen: item.lastSeen,
    isOnline: item.isOnline,
  }))
}

export async function setPresence(userId: string, isOnline: boolean, typing = false) {
  return prisma.chatUser.upsert({
    where: { userId },
    create: { userId, isOnline, typing, lastSeen: new Date() },
    update: { isOnline, typing, lastSeen: new Date() },
  })
}

export async function setTyping(userId: string, typing: boolean) {
  await prisma.chatUser.upsert({
    where: { userId },
    create: { userId, isOnline: true, typing, lastSeen: new Date() },
    update: { typing, lastSeen: new Date(), isOnline: true },
  })
}

export async function markRead(userId: string, channel: string) {
  await assertChannel(userId, channel)
  const presence = await prisma.chatUser.findUnique({ where: { userId } })
  const lastRead = (presence?.lastRead as Record<string, string> | null) ?? {}
  lastRead[channel] = new Date().toISOString()
  await prisma.chatUser.upsert({
    where: { userId },
    create: { userId, isOnline: true, lastRead, lastSeen: new Date() },
    update: { lastRead, lastSeen: new Date() },
  })
}

export async function getUnreadCount(userId: string) {
  const roles = await roleIds(userId)
  const presence = await prisma.chatUser.findUnique({ where: { userId } })
  const lastRead = (presence?.lastRead as Record<string, string> | null) ?? {}
  const channels = ['general', 'moderator', 'admin'].filter((channel) => canAccessChannel(roles, channel))

  const counts: Record<string, number> = {}
  for (const channel of channels) {
    const since = lastRead[channel] ? new Date(lastRead[channel]) : new Date(0)
    counts[channel] = await prisma.message.count({
      where: {
        channel,
        isDeleted: false,
        createdAt: { gt: since },
        userId: { not: userId },
      },
    })
  }
  return counts
}
