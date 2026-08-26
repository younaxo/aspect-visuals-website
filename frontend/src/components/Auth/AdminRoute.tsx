import { Navigate, Outlet } from 'react-router-dom'
import { Loader } from '../Common/Loader'
import { useAuth } from '../../hooks/useAuth'
import { isAdmin } from '../../utils/discordRoles'

export function AdminRoute() {
  const { user, isAuthenticated, isLoading, accessToken } = useAuth()

  if (isLoading && accessToken && !isAuthenticated) {
    return <Loader label="Проверяем сессию…" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin(user)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
