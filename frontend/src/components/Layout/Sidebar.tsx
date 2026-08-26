import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '../Common/Button'
import { UserNameLine } from '../Profile/UserNameLine'
import { useAuth } from '../../hooks/useAuth'
import { getHighestRole, isPanelAdmin } from '../../utils/discordRoles'
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
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const role = getHighestRole(user)
  const avatar = user ? getUserAvatarUrl(user) : fallbackAvatar
  const banner = user ? getUserBannerUrl(user.banner) : null

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!user) return null

  const close = () => setOpen(false)

  return (
    <div className={`profile-menu sidebar-account ${open ? 'is-open' : ''}`} ref={panelRef}>
      <button
        type="button"
        className={`profile-chip ${open ? 'open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
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
        <div className="profile-dropdown liquid-glass" role="dialog" aria-label="Минипрофиль">
          <div
            className="profile-dropdown-banner"
            style={banner ? { backgroundImage: `url(${banner})` } : undefined}
          />
          <div className="profile-dropdown-body">
            <div className="profile-dropdown-user">
              <span className={`avatar-wrap avatar-lg status-${user.status ?? 'online'}`}>
                <img className="avatar" src={avatar} alt="" draggable={false} />
                <span className="online-dot" aria-hidden="true" />
              </span>
              <div className="profile-dropdown-meta">
                <UserNameLine user={user} compact />
                <p className="profile-status-line">
                  {user.customStatus || STATUS_LABELS[user.status ?? 'online']}
                </p>
                <p className="profile-joined">
                  На сайте с {format(new Date(user.createdAt), 'd MMMM yyyy', { locale: ru })}
                </p>
              </div>
            </div>
            <Link to="/profile" className="dropdown-link" onClick={close}>
              Профиль
            </Link>
            {isPanelAdmin(user) && (
              <Link to="/admin" className="dropdown-link" onClick={close}>
                Админ-панель
              </Link>
            )}
            <Link to="/profile/settings" className="dropdown-link" onClick={close}>
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
