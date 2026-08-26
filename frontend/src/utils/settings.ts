import type { ThemePreference, UserSettings } from '../types'

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  notifications: true,
  soundEnabled: true,
  compactSidebar: false,
  animations: true,
  language: 'ru',
}

export function resolveTheme(theme: ThemePreference): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme === 'light' ? 'light' : 'dark'
}

export function applySettings(settings: UserSettings) {
  const resolved = resolveTheme(settings.theme)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.dataset.themePreference = settings.theme
  root.dataset.sound = settings.soundEnabled ? 'on' : 'off'
  root.dataset.compact = settings.compactSidebar ? 'true' : 'false'
  root.lang = settings.language === 'en' ? 'en' : 'ru'

  const themeColor = document.querySelector('meta[name="theme-color"]')
  themeColor?.setAttribute('content', resolved === 'light' ? '#f4f4f5' : '#09090b')
}
