import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from './components/Auth/ProtectedRoute'
import { MainLayout } from './components/Layout/MainLayout'
import { DiscordCallback } from './pages/DiscordCallback'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="news" element={<PlaceholderPage title="Новости" />} />
            <Route path="shop" element={<PlaceholderPage title="Магазин" />} />
            <Route path="privacy" element={<PlaceholderPage title="Политика конфиденциальности" />} />
            <Route path="terms" element={<PlaceholderPage title="Пользовательское соглашение" />} />
            <Route path="legal" element={<PlaceholderPage title="Юридическая информация" />} />
            <Route path="refund" element={<PlaceholderPage title="Политика возвратов" />} />
            <Route path="auth/discord/callback" element={<DiscordCallback />} />
            <Route element={<ProtectedRoute />}>
              <Route path="settings" element={<PlaceholderPage title="Настройки" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
