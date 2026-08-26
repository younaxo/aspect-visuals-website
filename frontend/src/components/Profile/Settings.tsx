import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useProfile } from '../../hooks/useProfile'
import type { ThemePreference } from '../../types'

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <label className="settings-row">
      <span>
        <span className="settings-label">{label}</span>
        <span className="settings-desc">{description}</span>
      </span>
      <input
        type="checkbox"
        className="settings-toggle"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

export function Settings() {
  const settings = useAuthStore((state) => state.settings)
  const { saveSettings, isSaving } = useProfile()
  const [error, setError] = useState<string | null>(null)

  const patch = async (payload: Partial<typeof settings>) => {
    setError(null)
    try {
      await saveSettings(payload)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить настройки')
    }
  }

  return (
    <section className="settings-page">
      <header className="content-panel settings-hero">
        <p className="eyebrow">Аккаунт</p>
        <h1 className="page-title">Настройки</h1>
        <p className="page-text">Интерфейс сайта. Тема и анимации применяются сразу.</p>
      </header>

      <article className="settings-card">
        <ToggleRow
          label="Компактный сайдбар"
          description="Скрывает имя в шапке и делает карточку профиля уже"
          checked={settings.compactSidebar}
          disabled={isSaving}
          onChange={(compactSidebar) => void patch({ compactSidebar })}
        />
        <ToggleRow
          label="Звуки интерфейса"
          description="Короткие звуки при действиях в чате и магазине"
          checked={settings.soundEnabled}
          disabled={isSaving}
          onChange={(soundEnabled) => void patch({ soundEnabled })}
        />
        <ToggleRow
          label="Анимации"
          description="Плавное появление панелей и карточек"
          checked={settings.animations}
          disabled={isSaving}
          onChange={(animations) => void patch({ animations })}
        />
        <ToggleRow
          label="Уведомления"
          description="Системные уведомления о покупках и сообщениях"
          checked={settings.notifications}
          disabled={isSaving}
          onChange={(notifications) => void patch({ notifications })}
        />

        <label className="settings-row">
          <span>
            <span className="settings-label">Тема</span>
            <span className="settings-desc">Тёмная, светлая или как в системе</span>
          </span>
          <select
            className="profile-input settings-select"
            value={settings.theme}
            disabled={isSaving}
            onChange={(event) => void patch({ theme: event.target.value as ThemePreference })}
          >
            <option value="dark">Тёмная</option>
            <option value="light">Светлая</option>
            <option value="system">Системная</option>
          </select>
        </label>

        {error && <p className="error-text">{error}</p>}
      </article>
    </section>
  )
}
