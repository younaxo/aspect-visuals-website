import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { EdgeDock } from './EdgeDock'
import { Toast } from '../Common/Toast'
import { ChatNotifier } from '../Chat/ChatNotifier'
import { ChatModal } from '../Chat/ChatModal'
import { useAuthStore } from '../../store/authStore'
import { applySettings } from '../../utils/settings'

export function MainLayout() {
  const settings = useAuthStore((state) => state.settings)
  const isAuthenticated = useAuthStore((state) => Boolean(state.user && state.accessToken))

  useEffect(() => {
    applySettings(settings)
  }, [settings])

  useEffect(() => {
    if (settings.theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applySettings(useAuthStore.getState().settings)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [settings.theme])

  return (
    <div className={`site ${isAuthenticated ? 'has-dock' : ''}`}>
      <Header />
      <EdgeDock />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
      <Toast />
      <ChatNotifier />
      <ChatModal />
    </div>
  )
}
