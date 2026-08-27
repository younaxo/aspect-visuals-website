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
 * Капча обязательна для всех клиентов, включая лаунчер.
 *
 * Интерфейс лаунчера грузится с file://, где виджет Turnstile не работает,
 * поэтому лаунчер открывает страницу /api/auth/captcha на нашем домене
 * в отдельном окне и присылает полученный оттуда токен обычным способом.
 */
export async function assertTurnstile(req: Request, res: Response): Promise<boolean> {
  if (!turnstileConfigured()) return true

  const token = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : ''
  const ok = await verifyTurnstileToken(token, req.ip)
  if (!ok) {
    res.status(400).json({ message: 'Подтвердите капчу CloudFlare' })
    return false
  }
  return true
}
