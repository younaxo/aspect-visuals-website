import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/authStore'
import { useDiscord } from '../../hooks/useDiscord'
import { useProfile } from '../../hooks/useProfile'
import { useToastStore } from '../../store/toastStore'
import { getUserAvatarUrl } from '../../utils/media'
import { Button } from '../Common/Button'
import { CustomSelect } from '../Common/CustomSelect'
import type { ThemePreference } from '../../types'

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

function DiscordGlyph() {
  return (
    <svg className="discord-settings-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  )
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
  const user = useAuthStore((state) => state.user)
  const { saveSettings, isSaving } = useProfile()
  const { unlinkDiscord } = useAuth()
  const { link, isLoading: discordBusy, error: discordError } = useDiscord()
  const showToast = useToastStore((state) => state.showToast)
  const [error, setError] = useState<string | null>(null)

  const linked = Boolean(user?.discordLinked && user.discordId)
  const avatar = user ? getUserAvatarUrl(user) : null

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
        <p className="page-text">Интерфейс сайта и привязка Discord.</p>
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
          <CustomSelect
            className="settings-select"
            value={settings.theme}
            disabled={isSaving}
            onChange={(theme) => void patch({ theme: theme as ThemePreference })}
            options={[
              { value: 'dark', label: 'Тёмная' },
              { value: 'light', label: 'Светлая' },
              { value: 'system', label: 'Системная' },
            ]}
          />
        </label>

        {error && <p className="error-text">{error}</p>}
      </article>

      <article className={`discord-settings-card ${linked ? 'is-linked' : ''}`}>
        <div className="discord-settings-head">
          <span className="discord-settings-icon" aria-hidden="true">
            <DiscordGlyph />
          </span>
          <div className="discord-settings-copy">
            <div className="discord-settings-title-row">
              <h2>Discord</h2>
              <span className={`discord-status-pill ${linked ? 'on' : 'off'}`}>
                {linked ? 'Привязан' : 'Не привязан'}
              </span>
            </div>
            <p>
              {linked
                ? 'Вход через Discord и синхронизация ролей доступны для этого аккаунта.'
                : 'Привяжите Discord, чтобы входить через него и синхронизировать роли сервера.'}
            </p>
          </div>
        </div>

        {linked && user ? (
          <div className="discord-settings-account">
            <img className="discord-settings-avatar" src={avatar ?? undefined} alt="" draggable={false} />
            <div className="discord-settings-account-meta">
              <span className="discord-settings-account-name">{user.username}</span>
              <span className="discord-settings-account-id">ID {user.discordId}</span>
            </div>
            <a
              className="btn-ghost discord-settings-open"
              href={`https://discord.com/users/${user.discordId}`}
              target="_blank"
              rel="noreferrer"
            >
              Открыть профиль
            </a>
          </div>
        ) : null}

        {discordError && <p className="error-text">{discordError}</p>}

        <div className="discord-settings-actions">
          {linked ? (
            <Button
              variant="ghost"
              disabled={discordBusy}
              onClick={() => {
                void unlinkDiscord()
                  .then(() => showToast('Discord отвязан', 'success'))
                  .catch((err: unknown) => {
                    const message = err instanceof Error ? err.message : 'Не удалось отвязать Discord'
                    showToast(message, 'error')
                  })
              }}
            >
              Отвязать
            </Button>
          ) : (
            <Button
              variant="primary"
              className="discord-link-btn"
              disabled={discordBusy}
              onClick={() => {
                void link().catch((err: unknown) => {
                  const message = err instanceof Error ? err.message : 'Не удалось начать привязку Discord'
                  showToast(message, 'error')
                })
              }}
            >
              <DiscordGlyph />
              {discordBusy ? 'Открываем Discord…' : 'Привязать Discord'}
            </Button>
          )}
        </div>
      </article>
    </section>
  )
}
