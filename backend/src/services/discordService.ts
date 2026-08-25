import axios from 'axios'
import { prisma } from '../utils/prisma'

const DISCORD_API = 'https://discord.com/api/v10'

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

export async function exchangeCode(code: string): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || '',
    client_secret: process.env.DISCORD_CLIENT_SECRET || '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/auth/discord/callback`
      : 'http://localhost:5173/auth/discord/callback',
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

export async function getGuildMemberRoles(discordId: string): Promise<string[]> {
  const guildId = process.env.DISCORD_GUILD_ID
  const botToken = process.env.DISCORD_BOT_TOKEN

  if (!guildId || !botToken) {
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
  const roles = await prisma.role.findMany({
    where: {
      discordId: { in: discordRoleIds },
    },
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
