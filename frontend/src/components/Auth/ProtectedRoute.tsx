import { Navigate, Outlet } from 'react-router-dom'
import { Loader } from '../Common/Loader'
import { useAuth } from '../../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, accessToken } = useAuth()

  if (isLoading && accessToken && !isAuthenticated) {
    return <Loader label="Проверяем сессию…" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
