import type { Request, Response } from 'express'

export function turnstileConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim())
}

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return true
  if (!token.trim()) return false

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  })
  if (ip) body.set('remoteip', ip)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  })
  const data = (await res.json()) as { success?: boolean }
  return Boolean(data.success)
}

/**
 * Turnstile привязан к домену, а Electron-лаунчер грузит интерфейс с file://,
 * поэтому получить валидный токен он физически не может (ошибка 110200).
 *
 * Признак определяется по отсутствию браузерного Origin — ровно тот же сигнал,
 * что и в CORS. Это не защита от подделки: клиент может не прислать Origin.
 * Для таких запросов защитой служит rate limit на вход и регистрацию.
 */
export function isLauncherRequest(req: Request): boolean {
  const origin = req.headers.origin
  return !origin || origin === 'null' || origin.startsWith('file://')
}

export async function assertTurnstile(req: Request, res: Response): Promise<boolean> {
  if (!turnstileConfigured()) return true
  if (isLauncherRequest(req)) return true

  const token = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : ''
  const ok = await verifyTurnstileToken(token, req.ip)
  if (!ok) {
    res.status(400).json({ message: 'Подтвердите капчу CloudFlare' })
    return false
  }
  return true
}
