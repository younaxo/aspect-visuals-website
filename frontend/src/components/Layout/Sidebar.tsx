import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../Common/Button'
import { ImageUpload } from '../Common/ImageUpload'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { getHighestRole } from '../../utils/discordRoles'
import { getUserAvatarUrl, getUserBannerUrl } from '../../utils/media'

const fallbackAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%2327272a'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%2352525b'/%3E%3Cpath d='M8 58c4-14 16-20 24-20s20 6 24 20' fill='%2352525b'/%3E%3C/svg%3E"

export function Sidebar() {
  const { user, logout } = useAuth()
  const { saveProfile, uploadAvatar, uploadBanner, isSaving } = useProfile()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(user?.username ?? '')
  const [tag, setTag] = useState(user?.discriminator ?? '')
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const role = getHighestRole(user)
  const avatar = user ? getUserAvatarUrl(user) : fallbackAvatar
  const banner = user ? getUserBannerUrl(user.banner) : null

  useEffect(() => {
    setUsername(user?.username ?? '')
    setTag(user?.discriminator ?? '')
  }, [user?.username, user?.discriminator])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  if (!user) return null

  const close = () => setOpen(false)

  const persistIdentity = async () => {
    const nextName = username.trim()
    const nextTag = tag.trim()
    if (!nextName || nextName.length < 2) {
      setUsername(user.username)
      return
    }
    if (nextName === user.username && nextTag === (user.discriminator ?? '')) return

    setError(null)
    try {
      await saveProfile({
        username: nextName,
        discriminator: nextTag || null,
      })
    } catch (err: unknown) {
      setUsername(user.username)
      setTag(user.discriminator ?? '')
      setError(err instanceof Error ? err.message : 'Не удалось сохранить имя')
    }
  }

  const onIdentityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
    if (event.key === 'Escape') {
      setUsername(user.username)
      setTag(user.discriminator ?? '')
      event.currentTarget.blur()
    }
  }

  return (
    <div className="profile-menu sidebar-account" ref={panelRef}>
      <button
        type="button"
        className={`profile-chip ${open ? 'open' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`avatar-wrap status-${user.status ?? 'online'}`}>
          <img className="avatar" src={avatar} alt="" draggable={false} />
          <span className="online-dot" aria-hidden="true" />
        </span>
        <span className="profile-meta">
          <span className="profile-name">{user.username}</span>
          <span className="profile-role">{role?.name ?? 'Профиль'}</span>
        </span>
      </button>

      {open && (
        <div className="profile-dropdown liquid-glass" role="dialog" aria-label="Профиль">
          <div className="profile-dropdown-banner-slot">
            <ImageUpload
              variant="banner"
              currentImage={banner}
              onUpload={uploadBanner}
              label="Загрузить баннер"
            />
          </div>
          <div className="profile-dropdown-body">
            <div className="profile-dropdown-user">
              <ImageUpload
                variant="avatar"
                size="medium"
                currentImage={avatar}
                onUpload={uploadAvatar}
                label="Загрузить аватар"
              />
              <div className="profile-inline-fields">
                <input
                  className="profile-input profile-input-compact"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onBlur={() => void persistIdentity()}
                  onKeyDown={onIdentityKeyDown}
                  maxLength={32}
                  disabled={isSaving}
                  aria-label="Имя пользователя"
                />
                <input
                  className="profile-input profile-input-tag profile-input-compact"
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  onBlur={() => void persistIdentity()}
                  onKeyDown={onIdentityKeyDown}
                  maxLength={5}
                  placeholder="тег"
                  disabled={isSaving}
                  aria-label="Тег"
                />
              </div>
            </div>
            {user.customStatus && <p className="profile-status-line">{user.customStatus}</p>}
            {role && <p className="profile-role">{role.name}</p>}
            {error && <p className="error-text">{error}</p>}
            <Link to="/profile" className="dropdown-link" onClick={close}>
              Профиль
            </Link>
            <Link to="/settings" className="dropdown-link" onClick={close}>
              Настройки
            </Link>
            <Button
              variant="logout"
              onClick={() => {
                close()
                void logout()
              }}
            >
              Выйти с аккаунта
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
