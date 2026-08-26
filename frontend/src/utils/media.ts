const API_BASE = import.meta.env.VITE_API_URL || ''

export function getDiscordAvatarUrl(discordId: string, avatar?: string | null): string {
  if (!avatar || avatar.startsWith('/') || avatar.startsWith('http')) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(discordId) % 5}.png`
  }

  const format = avatar.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${format}`
}

export function resolveMediaUrl(value?: string | null): string | null {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value
  }
  if (value.startsWith('/uploads/')) {
    return `${API_BASE}${value}`
  }
  return null
}

export function getUserAvatarUrl(user: { discordId?: string | null; avatar?: string | null }): string {
  const custom = resolveMediaUrl(user.avatar)
  if (custom) return custom
  if (user.discordId) return getDiscordAvatarUrl(user.discordId, user.avatar)
  return 'https://cdn.discordapp.com/embed/avatars/0.png'
}

export function getUserBannerUrl(banner?: string | null): string | null {
  return resolveMediaUrl(banner)
}
