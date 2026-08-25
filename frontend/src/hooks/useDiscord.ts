const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize'

export function getDiscordLoginUrl(): string {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
  const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email guilds.members.read',
    prompt: 'consent',
  })

  return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`
}

export function getDiscordAvatarUrl(discordId: string, avatar?: string | null): string {
  if (!avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(discordId) % 5}.png`
  }

  const format = avatar.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${format}`
}

export function useDiscord() {
  const login = () => {
    window.location.href = getDiscordLoginUrl()
  }

  return {
    login,
    getLoginUrl: getDiscordLoginUrl,
    getAvatarUrl: getDiscordAvatarUrl,
  }
}
