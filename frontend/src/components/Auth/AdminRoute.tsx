import { Navigate, Outlet } from 'react-router-dom'
import { Loader } from '../Common/Loader'
import { useAuth } from '../../hooks/useAuth'
import { isPanelAdmin } from '../../utils/discordRoles'

export function AdminRoute() {
  const { user, isAuthenticated, isLoading, accessToken } = useAuth()

  if (isLoading && accessToken && !isAuthenticated) {
    return <Loader label="Проверяем сессию…" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isPanelAdmin(user)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
