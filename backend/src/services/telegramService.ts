import { createHmac, createHash } from 'crypto'

export interface TelegramAuthPayload {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

function botToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim()
}

export function telegramConfigured() {
  return botToken().length > 20
}

export async function getTelegramBotUsername(): Promise<string | null> {
  const token = botToken()
  if (!token) return null
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
  const data = (await res.json()) as { ok?: boolean; result?: { username?: string } }
  return data.ok && data.result?.username ? data.result.username : null
}

export function verifyTelegramAuth(payload: TelegramAuthPayload): boolean {
  const token = botToken()
  if (!token) return false

  const { hash, ...rest } = payload
  if (!hash || !payload.id || !payload.auth_date) return false

  const age = Date.now() / 1000 - Number(payload.auth_date)
  if (age > 86400 || age < -60) return false

  const dataCheckString = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n')

  const secret = createHash('sha256').update(token).digest()
  const hmac = createHmac('sha256', secret).update(dataCheckString).digest('hex')
  return hmac === hash
}
