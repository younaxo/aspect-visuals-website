import axios from 'axios'
import { prisma } from '../utils/prisma'

const DISCORD_API = 'https://discord.com/api/v10'
const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize'

export const ROLE_MAPPING: Record<string, string> = {
  '1541875062208995328': 'Owner',
  '1541784961986596874': 'Developer',
  '1541875599331561604': 'Technical Administrator',
  '1541785126856429568': 'Administrator',
  '1541785097374793799': 'Chief Moderator',
  '1541785042706235472': 'Moderator',
  '1541785160297480243': 'Support',
  '1541875642524766290': 'Subscriber_Plus',
  '1541790489399791716': 'Subscriber',
  '1541869586004058264': 'Default',
}

export const DEFAULT_DISCORD_ROLE_ID = '1541869586004058264'

interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  email?: string
}

interface DiscordGuildMember {
  roles: string[]
  user?: DiscordUser
}

export function getOAuthRedirectUri(): string {
  const explicit = (process.env.DISCORD_REDIRECT_URI || '').trim()
  if (explicit && !explicit.includes('localhost')) {
    return explicit
  }
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${frontend}/auth/discord/callback`
}

export function getOAuthUrl(state: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) {
    throw new Error('DISCORD_CLIENT_ID не задан')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri(),
    response_type: 'code',
    scope: 'identify email guilds.members.read',
    state,
    prompt: 'consent',
  })

  return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`
}

export async function exchangeCode(code: string): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || '',
    client_secret: process.env.DISCORD_CLIENT_SECRET || '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: getOAuthRedirectUri(),
  })

  const { data } = await axios.post<DiscordTokenResponse>(`${DISCORD_API}/oauth2/token`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return data
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const { data } = await axios.get<DiscordUser>(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  return data
}

export async function getGuildMemberRoles(
  discordId: string,
  userAccessToken?: string,
): Promise<string[]> {
  const guildId = process.env.DISCORD_GUILD_ID
  if (!guildId) {
    return []
  }

  // Сначала пробуем OAuth-токен пользователя (scope guilds.members.read)
  if (userAccessToken) {
    try {
      const { data } = await axios.get<DiscordGuildMember>(
        `${DISCORD_API}/users/@me/guilds/${guildId}/member`,
        { headers: { Authorization: `Bearer ${userAccessToken}` } },
      )
      return data.roles
    } catch {
      // Пользователь не на сервере или scope недоступен — fallback на бота
    }
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    return []
  }

  try {
    const { data } = await axios.get<DiscordGuildMember>(
      `${DISCORD_API}/guilds/${guildId}/members/${discordId}`,
      { headers: { Authorization: `Bot ${botToken}` } },
    )
    return data.roles
  } catch {
    return []
  }
}

export async function syncUserRoles(userId: string, discordRoleIds: string[]) {
  // Сопоставляем Discord ID с ROLE_MAPPING; если совпадений нет — выдаём Default
  const matchedIds = discordRoleIds.filter((id) => id in ROLE_MAPPING)
  const idsToSet = matchedIds.length > 0 ? matchedIds : [DEFAULT_DISCORD_ROLE_ID]

  await Promise.all(
    idsToSet.map((discordId) =>
      prisma.role.upsert({
        where: { discordId },
        update: { name: ROLE_MAPPING[discordId] },
        create: { discordId, name: ROLE_MAPPING[discordId] },
      }),
    ),
  )

  const roles = await prisma.role.findMany({
    where: { discordId: { in: idsToSet } },
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      roles: {
        set: roles.map((role) => ({ id: role.id })),
      },
    },
  })
}

async function botRequest(method: 'put' | 'delete', path: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID
  if (!botToken || !guildId) return

  await axios({
    method,
    url: `${DISCORD_API}/guilds/${guildId}${path}`,
    headers: { Authorization: `Bot ${botToken}` },
    validateStatus: (status) => status < 500,
  })
}

export async function giveRole(discordId: string, roleId: string) {
  await botRequest('put', `/members/${discordId}/roles/${roleId}`)
}

export async function removeRole(discordId: string, roleId: string) {
  await botRequest('delete', `/members/${discordId}/roles/${roleId}`)
}

export async function syncSubscriptionRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userSubscriptions: {
        where: { isActive: true },
        include: { subscription: true },
      },
    },
  })

  if (!user?.discordId) return

  const roleIds = user.userSubscriptions
    .map((item) => item.subscription.discordRoleId)
    .filter((id): id is string => Boolean(id))

  const unique = [...new Set(roleIds)]
  await Promise.all(unique.map((roleId) => giveRole(user.discordId as string, roleId)))

  if (unique.length) {
    const current = await getGuildMemberRoles(user.discordId)
    await syncUserRoles(user.id, [...new Set([...current, ...unique])])
  }
}

export async function notifyPurchase(payload: {
  username: string
  itemName: string
  amount: number
}) {
  const webhook = process.env.DISCORD_PURCHASES_WEBHOOK_URL
  if (!webhook) return

  await axios.post(webhook, {
    content: `Покупка: **${payload.username}** — ${payload.itemName} на ${payload.amount} ₽`,
  })
}
