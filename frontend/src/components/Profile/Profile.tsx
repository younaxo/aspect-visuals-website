import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ImageUpload } from '../Common/ImageUpload'
import { Button } from '../Common/Button'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { getUserAvatarUrl, getUserBannerUrl } from '../../utils/media'
import { DISCORD_ROLE_LABELS, getRoleKeyByDiscordId } from '../../utils/discordRoles'
import type { PresenceStatus, User } from '../../types'

const STATUS_OPTIONS: Array<{ value: PresenceStatus; label: string }> = [
  { value: 'online', label: 'В сети' },
  { value: 'idle', label: 'Отошёл' },
  { value: 'dnd', label: 'Не беспокоить' },
  { value: 'offline', label: 'Не в сети' },
]

interface ProfileFormState {
  username: string
  discriminator: string
  customStatus: string
  bio: string
  location: string
  website: string
  status: PresenceStatus
}

function toFormState(user: User): ProfileFormState {
  return {
    username: user.username,
    discriminator: user.discriminator ?? '',
    customStatus: user.customStatus ?? '',
    bio: user.bio ?? '',
    location: user.location ?? '',
    website: user.website ?? '',
    status: user.status ?? 'online',
  }
}

export function Profile() {
  const { user: authUser } = useAuth()
  const { profile, subscriptions, saveProfile, uploadAvatar, uploadBanner, removeAvatar, removeBanner, isSaving } =
    useProfile()
  const user = profile?.user ?? authUser

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileFormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (user && !editing) {
      setForm(toFormState(user))
    }
  }, [user, editing])

  const avatar = user ? getUserAvatarUrl(user) : null
  const banner = user ? getUserBannerUrl(user.banner) : null
  const joined = useMemo(() => {
    if (!user?.createdAt) return null
    return formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: ru })
  }, [user?.createdAt])

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
    setNotice(null)
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
        discriminator: form.discriminator.trim() || null,
        customStatus: form.customStatus.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        website: form.website.trim() || null,
        status: form.status,
      })
      setEditing(false)
      setNotice('Профиль сохранён. Имя на сайте не меняет Discord.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль')
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
              <ImageUpload
                variant="avatar"
                size="large"
                currentImage={avatar}
                onUpload={uploadAvatar}
                onRemove={user.avatar?.startsWith('/uploads/') ? () => removeAvatar() : undefined}
                label="Загрузить аватар"
              />
            ) : (
              <span className={`avatar-wrap avatar-xl status-${user.status ?? 'online'}`}>
                <img className="avatar" src={avatar ?? undefined} alt="" draggable={false} />
                <span className="online-dot" aria-hidden="true" />
              </span>
            )}

            <div className="profile-identity-meta">
              {editing ? (
                <div className="profile-inline-fields">
                  <input
                    className="profile-input"
                    value={form.username}
                    onChange={(event) => setForm({ ...form, username: event.target.value })}
                    maxLength={32}
                    aria-label="Имя пользователя"
                  />
                  <input
                    className="profile-input profile-input-tag"
                    value={form.discriminator}
                    onChange={(event) => setForm({ ...form, discriminator: event.target.value })}
                    maxLength={5}
                    placeholder="тег"
                    aria-label="Тег"
                  />
                </div>
              ) : (
                <h1 className="profile-display-name">
                  {user.username}
                  {user.discriminator ? <span className="profile-tag">#{user.discriminator}</span> : null}
                </h1>
              )}
              <p className="profile-status-line">
                {user.customStatus || STATUS_OPTIONS.find((item) => item.value === (user.status ?? 'online'))?.label}
              </p>
              {joined && <p className="profile-joined">На сайте {joined}</p>}
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
          {notice && <p className="profile-notice">{notice}</p>}

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
                <select
                  className="profile-input"
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as PresenceStatus })}
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="profile-field">
                <span>О себе</span>
                <textarea
                  className="profile-input profile-textarea"
                  value={form.bio}
                  onChange={(event) => setForm({ ...form, bio: event.target.value })}
                  maxLength={190}
                  rows={4}
                  placeholder="Коротко о себе"
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
                <p className="profile-bio">{user.bio}</p>
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
              </ul>
            </div>
          )}

          <section className="profile-section" aria-label="Роли">
            <h2>Роли</h2>
            <div className="role-list">
              {user.roles.length ? (
                user.roles.map((role) => {
                  const key = getRoleKeyByDiscordId(role.discordId)
                  return (
                    <span key={role.id} className="role-chip">
                      {key ? DISCORD_ROLE_LABELS[key] : role.name}
                    </span>
                  )
                })
              ) : (
                <p className="page-text">Роли пока не синхронизированы.</p>
              )}
            </div>
          </section>

          <section className="profile-section" aria-label="Подписки">
            <h2>Подписки</h2>
            {subscriptions.length ? (
              <ul className="subscription-list">
                {subscriptions.map((item) => (
                  <li key={item.id} className="subscription-item">
                    <span>{item.name}</span>
                    <span>
                      {item.expiresAt
                        ? formatDistanceToNow(new Date(item.expiresAt), { addSuffix: true, locale: ru })
                        : 'Навсегда'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="page-text">Нет активных подписок.</p>
            )}
          </section>
        </div>
      </article>
    </section>
  )
}
