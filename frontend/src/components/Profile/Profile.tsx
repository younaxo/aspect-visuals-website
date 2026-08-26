import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ImageUpload } from '../Common/ImageUpload'
import { Button } from '../Common/Button'
import { UserNameLine } from './UserNameLine'
import { CustomSelect } from '../Common/CustomSelect'
import { RoleHierarchy } from './RoleHierarchy'
import { MySubscriptions } from './MySubscriptions'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useToastStore } from '../../store/toastStore'
import { getUserAvatarUrl, getUserBannerUrl } from '../../utils/media'
import { renderMarkdown } from '../../utils/markdown'
import type { PresenceStatus, User } from '../../types'

const STATUS_OPTIONS: Array<{ value: PresenceStatus; label: string }> = [
  { value: 'online', label: 'В сети' },
  { value: 'idle', label: 'Отошёл' },
  { value: 'dnd', label: 'Не беспокоить' },
  { value: 'offline', label: 'Не в сети' },
]

interface ProfileFormState {
  username: string
  customStatus: string
  bio: string
  location: string
  website: string
  status: PresenceStatus
}

function toFormState(user: User): ProfileFormState {
  return {
    username: user.username,
    customStatus: user.customStatus ?? '',
    bio: user.bio ?? '',
    location: user.location ?? '',
    website: user.website ?? '',
    status: user.status ?? 'online',
  }
}

export function Profile({ customizeOnly = false }: { customizeOnly?: boolean }) {
  const { user: authUser } = useAuth()
  const { profile, saveProfile, uploadAvatar, uploadBanner, removeAvatar, removeBanner, isSaving } =
    useProfile()
  const showToast = useToastStore((state) => state.showToast)
  const user = profile?.user ?? authUser

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileFormState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && !editing) {
      setForm(toFormState(user))
    }
  }, [user, editing])

  const avatar = user ? getUserAvatarUrl(user) : null
  const banner = user ? getUserBannerUrl(user.banner) : null

  if (!user || !form) {
    return (
      <section className="content-panel">
        <p className="page-text">Загружаем профиль…</p>
      </section>
    )
  }

  const startEdit = () => {
    setForm(toFormState(user))
    setEditing(true)
    setError(null)
  }

  const cancelEdit = () => {
    setForm(toFormState(user))
    setEditing(false)
    setError(null)
  }

  const save = async () => {
    setError(null)
    try {
      await saveProfile({
        username: form.username.trim(),
        customStatus: form.customStatus.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        website: form.website.trim() || null,
        status: form.status,
      })
      setEditing(false)
      showToast('Профиль сохранён. Ник на сайте не меняет Discord.', 'success')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить профиль'
      setError(message)
      showToast(message, 'error')
    }
  }

  return (
    <section className="profile-page">
      <article className="profile-card">
        <div className="profile-banner-wrap">
          {editing ? (
            <ImageUpload
              variant="banner"
              currentImage={banner}
              onUpload={uploadBanner}
              onRemove={banner ? () => removeBanner() : undefined}
              label="Загрузить баннер"
            />
          ) : (
            <div
              className="profile-banner-view"
              style={banner ? { backgroundImage: `url(${banner})` } : undefined}
            />
          )}
        </div>

        <div className="profile-card-body">
          <div className="profile-identity">
            {editing ? (
              <div className={`avatar-upload-slot avatar-xl status-${user.status ?? 'online'}`}>
                <ImageUpload
                  variant="avatar"
                  size="large"
                  currentImage={avatar}
                  onUpload={uploadAvatar}
                  onRemove={user.avatar?.startsWith('/uploads/') ? () => removeAvatar() : undefined}
                  label="Загрузить аватар"
                />
                <span className="online-dot" aria-hidden="true" />
              </div>
            ) : (
              <span className={`avatar-wrap avatar-xl status-${user.status ?? 'online'}`}>
                <img className="avatar" src={avatar ?? undefined} alt="" draggable={false} />
                <span className="online-dot" aria-hidden="true" />
              </span>
            )}

            <div className="profile-identity-meta">
              <UserNameLine
                user={user}
                editing={editing}
                username={form.username}
                onUsernameChange={(value) => setForm({ ...form, username: value })}
              />
              <p className="profile-status-line">
                {user.customStatus || STATUS_OPTIONS.find((item) => item.value === (user.status ?? 'online'))?.label}
              </p>
              <p className="profile-joined">
                На сайте с {format(new Date(user.createdAt), 'd MMMM yyyy', { locale: ru })}
              </p>
            </div>

            <div className="profile-identity-actions">
              {editing ? (
                <>
                  <Button variant="primary" onClick={() => void save()} disabled={isSaving}>
                    {isSaving ? 'Сохраняем…' : 'Сохранить'}
                  </Button>
                  <Button variant="ghost" onClick={cancelEdit} disabled={isSaving}>
                    Отмена
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={startEdit}>
                  Редактировать
                </Button>
              )}
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          {editing ? (
            <form
              className="profile-form"
              onSubmit={(event) => {
                event.preventDefault()
                void save()
              }}
            >
              <label className="profile-field">
                <span>Пользовательский статус</span>
                <input
                  className="profile-input"
                  value={form.customStatus}
                  onChange={(event) => setForm({ ...form, customStatus: event.target.value })}
                  maxLength={128}
                  placeholder="Чем сейчас заняты"
                />
              </label>
              <label className="profile-field">
                <span>Присутствие</span>
                <CustomSelect
                  value={form.status}
                  onChange={(status) => setForm({ ...form, status: status as PresenceStatus })}
                  options={STATUS_OPTIONS}
                />
              </label>
              <label className="profile-field">
                <span>О себе</span>
                <textarea
                  className="profile-input profile-textarea"
                  value={form.bio}
                  onChange={(event) => setForm({ ...form, bio: event.target.value })}
                  maxLength={1000}
                  rows={5}
                  placeholder="Markdown: **жирный**, *курсив*, ссылки и переносы строк"
                />
              </label>
              <label className="profile-field">
                <span>Местоположение</span>
                <input
                  className="profile-input"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  maxLength={80}
                  placeholder="Город"
                />
              </label>
              <label className="profile-field">
                <span>Сайт</span>
                <input
                  className="profile-input"
                  value={form.website}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                  maxLength={200}
                  placeholder="https://"
                />
              </label>
            </form>
          ) : (
            <div className="profile-details">
              {user.bio && (
                <div
                  className="profile-bio markdown-body"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(user.bio) }}
                />
              )}
              <ul className="profile-facts">
                {user.location && <li>{user.location}</li>}
                {user.website && (
                  <li>
                    <a href={user.website} target="_blank" rel="noreferrer">
                      {user.website.replace(/^https?:\/\//, '')}
                    </a>
                  </li>
                )}
                {user.discordLinked && user.discordId && (
                  <li>
                    <a
                      className="discord-profile-link"
                      href={`https://discord.com/users/${user.discordId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg className="icon icon-fill" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      Discord
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          <section className="profile-section" aria-label="Роли">
            <h2>Роли</h2>
            <div className="role-list">
              <RoleHierarchy roles={user.roles} />
            </div>
          </section>

          {!customizeOnly && <MySubscriptions />}
        </div>
      </article>
    </section>
  )
}
