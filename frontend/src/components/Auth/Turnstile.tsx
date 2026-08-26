import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id: string) => void
    }
  }
}

interface TurnstileProps {
  onToken: (token: string) => void
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

export function turnstileEnabled() {
  return Boolean(SITE_KEY)
}

export function Turnstile({ onToken }: TurnstileProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY || !hostRef.current) return
    let cancelled = false

    const mount = () => {
      if (cancelled || !hostRef.current || !window.turnstile) return
      widgetId.current = window.turnstile.render(hostRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }

    if (window.turnstile) {
      mount()
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
      if (!existing) {
        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.dataset.turnstile = '1'
        script.onload = mount
        document.head.appendChild(script)
      } else {
        existing.addEventListener('load', mount)
      }
    }

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          // ignore
        }
      }
    }
  }, [onToken])

  if (!SITE_KEY) return null
  return <div className="turnstile-wrap" ref={hostRef} />
}
