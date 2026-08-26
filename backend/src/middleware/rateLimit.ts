import type { NextFunction, Request, Response } from 'express'

interface Bucket {
  count: number
  resetAt: number
}

const windows = new Map<string, Bucket>()

function clientKey(req: Request, scope: string): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  return `${scope}:${ip}`
}

export function rateLimit(scope: string, max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = clientKey(req, scope)
    const now = Date.now()
    const bucket = windows.get(key)

    if (!bucket || bucket.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    if (bucket.count >= max) {
      res.status(429).json({ message: 'Слишком много запросов. Подождите и попробуйте снова.' })
      return
    }

    bucket.count += 1
    next()
  }
}

export const registerLimiter = rateLimit('register', 8, 15 * 60 * 1000)
export const loginLimiter = rateLimit('login', 20, 15 * 60 * 1000)
export const forgotPasswordLimiter = rateLimit('forgot-password', 5, 15 * 60 * 1000)
export const resetPasswordLimiter = rateLimit('reset-password', 10, 15 * 60 * 1000)
