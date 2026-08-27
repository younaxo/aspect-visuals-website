import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
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
import { NewsPage } from './pages/NewsPage'
import { NewsArticlePage } from './pages/NewsArticlePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { Shop } from './components/Shop/Shop'
import { MockPayPage } from './components/Shop/MockPayPage'
import { ProfileHub } from './components/Profile/ProfileHub'
import { AccountPanel } from './components/Profile/AccountPanel'
import { Profile } from './components/Profile/Profile'
import { ProfilePlaceholder } from './components/Profile/ProfilePlaceholder'
import { Settings } from './components/Profile/Settings'
import { MySubscriptions } from './components/Profile/MySubscriptions'
import { DownloadClient } from './components/Profile/DownloadClient'
import { DailyBonus } from './components/Profile/DailyBonus'
import { ConfigsPage } from './components/Profile/ConfigsPage'
import { CosmeticsPage } from './components/Profile/CosmeticsPage'
import { AdminRoute } from './components/Auth/AdminRoute'
import { PromoCodes } from './components/Admin/PromoCodes'
import { ActivationKeys } from './components/Admin/ActivationKeys'
import { BonusCodes } from './components/Admin/BonusCodes'
import { NewsList } from './components/Admin/NewsList'
import { AdminLayout } from './components/Admin/AdminLayout'
import { Dashboard } from './components/Admin/Dashboard'
import { UsersList } from './components/Admin/UsersList'
import { SubscriptionsList } from './components/Admin/SubscriptionsList'
import { ProductsList } from './components/Admin/ProductsList'
import { PurchasesList } from './components/Admin/PurchasesList'
import { AdminLogs } from './components/Admin/AdminLogs'
import { AdminSettings } from './components/Admin/Settings'
import { useUiStore } from './store/uiStore'
import { Checkout } from './components/Shop/Checkout'

function OpenChatRedirect() {
  const setChatOpen = useUiStore((state) => state.setChatOpen)
  useEffect(() => {
    setChatOpen(true)
  }, [setChatOpen])
  return <Navigate to="/" replace />
}

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
            <Route path="news" element={<NewsPage />} />
            <Route path="news/:slug" element={<NewsArticlePage />} />
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
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UsersList />} />
                <Route path="subscriptions" element={<SubscriptionsList />} />
                <Route path="products" element={<ProductsList />} />
                <Route path="promo" element={<PromoCodes />} />
                <Route path="bonus" element={<BonusCodes />} />
                <Route path="keys" element={<ActivationKeys />} />
                <Route path="news" element={<NewsList />} />
                <Route path="purchases" element={<PurchasesList />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="chat" element={<OpenChatRedirect />} />
              <Route path="activate" element={<Navigate to="/account" replace />} />
              <Route path="settings" element={<Navigate to="/account/settings" replace />} />
              <Route path="profile" element={<Navigate to="/account" replace />} />
              <Route path="profile/*" element={<Navigate to="/account" replace />} />
              <Route path="account" element={<ProfileHub />}>
                <Route index element={<AccountPanel />} />
                <Route path="me" element={<Profile />} />
                <Route path="bonus" element={<DailyBonus />} />
                <Route path="configs" element={<ConfigsPage />} />
                <Route path="cosmetics" element={<CosmeticsPage />} />
                <Route path="balance" element={<ProfilePlaceholder title="Баланс" text="Здесь будет история операций и пополнение." />} />
                <Route path="subscriptions" element={<MySubscriptions />} />
                <Route path="download" element={<DownloadClient />} />
                <Route path="support" element={<ProfilePlaceholder title="Поддержка" text="Напишите в чат или на support@aspectvisuals.su." />} />
                <Route path="settings" element={<Settings />} />
              </Route>
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
