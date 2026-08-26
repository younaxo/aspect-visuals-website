import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GuestRoute } from './components/Auth/GuestRoute'
import { ProtectedRoute } from './components/Auth/ProtectedRoute'
import { LoginPage } from './components/Auth/LoginPage'
import { RegisterPage } from './components/Auth/RegisterPage'
import { ForgotPasswordPage } from './components/Auth/ForgotPasswordPage'
import { ResetPasswordPage } from './components/Auth/ResetPasswordPage'
import { LoginDiscordPage } from './components/Auth/LoginDiscordPage'
import { MainLayout } from './components/Layout/MainLayout'
import { DiscordCallback } from './pages/DiscordCallback'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { Shop } from './components/Shop/Shop'
import { Cart } from './components/Shop/Cart'
import { Checkout } from './components/Shop/Checkout'
import { MockPayPage } from './components/Shop/MockPayPage'
import { Profile } from './components/Profile/Profile'
import { Settings } from './components/Profile/Settings'

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
            <Route path="shop" element={<Shop />} />
            <Route path="privacy" element={<PlaceholderPage title="Политика конфиденциальности" />} />
            <Route path="terms" element={<PlaceholderPage title="Пользовательское соглашение" />} />
            <Route path="legal" element={<PlaceholderPage title="Юридическая информация" />} />
            <Route path="refund" element={<PlaceholderPage title="Политика возвратов" />} />
            <Route
              path="login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="register"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route
              path="forgot-password"
              element={
                <GuestRoute>
                  <ForgotPasswordPage />
                </GuestRoute>
              }
            />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route
              path="discord-login"
              element={
                <GuestRoute>
                  <LoginDiscordPage />
                </GuestRoute>
              }
            />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="auth/discord/callback" element={<DiscordCallback />} />
            <Route path="discord-auth" element={<DiscordCallback />} />
            <Route element={<ProtectedRoute />}>
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="shop/cart" element={<Cart />} />
              <Route path="shop/checkout" element={<Checkout />} />
              <Route path="shop/pay/:orderId" element={<MockPayPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
