import { useAuth } from './useAuth'
import { isPanelAdmin } from '../utils/discordRoles'

export function useAdminAccess() {
  const { user, isAuthenticated, isLoading, accessToken } = useAuth()
  const allowed = isPanelAdmin(user)
  const checking = Boolean(isLoading && accessToken && !isAuthenticated)

  return { allowed, checking, user, isAuthenticated }
}
