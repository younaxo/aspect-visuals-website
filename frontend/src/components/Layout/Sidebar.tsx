import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '../Common/Button'
import { ImageUpload } from '../Common/ImageUpload'
import { UserNameLine } from '../Profile/UserNameLine'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { getHighestRole } from '../../utils/discordRoles'
import { getUserAvatarUrl, getUserBannerUrl } from '../../utils/media'

const fallbackAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%2327272a'/%3E%3Ccircle cx='32' cy='24' r='12' fill='%2352525b'/%3E%3Cpath d='M8 58c4-14 16-20 24-20s20 6 24 20' fill='%2352525b'/%3E%3C/svg%3E"

const STATUS_LABELS: Record<string, string> = {
  online: 'В сети',
  idle: 'Отошёл',
  dnd: 'Не беспокоить',
  offline: 'Не в сети',
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const { saveProfile, uploadAvatar, uploadBanner, isSaving } = useProfile()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(user?.username ?? '')
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const role = getHighestRole(user)
  const avatar = user ? getUserAvatarUrl(user) : fallbackAvatar
  const banner = user ? getUserBannerUrl(user.banner) : null

  useEffect(() => {
    setUsername(user?.username ?? '')
  }, [user?.username])

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

  const persistUsername = async () => {
    const nextName = username.trim()
    if (!nextName || nextName.length < 2) {
      setUsername(user.username)
      return
    }
    if (nextName === user.username) return

    setError(null)
    try {
      await saveProfile({ username: nextName })
    } catch (err: unknown) {
      setUsername(user.username)
      setError(err instanceof Error ? err.message : 'Не удалось сохранить имя')
    }
  }

  const onUsernameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
    if (event.key === 'Escape') {
      setUsername(user.username)
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
              <div className={`avatar-upload-slot status-${user.status ?? 'online'}`}>
                <ImageUpload
                  variant="avatar"
                  size="medium"
                  currentImage={avatar}
                  onUpload={uploadAvatar}
                  label="Загрузить аватар"
                />
                <span className="online-dot" aria-hidden="true" />
              </div>
              <div className="profile-dropdown-meta">
                <UserNameLine
                  user={user}
                  editing
                  compact
                  username={username}
                  disabled={isSaving}
                  onUsernameChange={setUsername}
                  onUsernameBlur={() => void persistUsername()}
                  onUsernameKeyDown={onUsernameKeyDown}
                />
                <p className="profile-status-line">
                  {user.customStatus || STATUS_LABELS[user.status ?? 'online']}
                </p>
                <p className="profile-joined">
                  На сайте с {format(new Date(user.createdAt), 'd MMMM yyyy', { locale: ru })}
                </p>
              </div>
            </div>
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
