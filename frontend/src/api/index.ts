import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'
import type { AuthTokens } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string | null> | null = null

function shouldSkipRefresh(url?: string): boolean {
  if (!url) return false
  return (
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/discord') ||
    url.includes('/api/auth/logout') ||
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/forgot-password') ||
    url.includes('/api/auth/reset-password')
  )
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (!original || error.response?.status !== 401 || original._retry || shouldSkipRefresh(original.url)) {
      return Promise.reject(error)
    }

    original._retry = true

    try {
      const accessToken = await refreshAccessToken()
      if (!accessToken) {
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }

      original.headers.Authorization = `Bearer ${accessToken}`
      return api(original)
    } catch (refreshError) {
      useAuthStore.getState().logout()
      return Promise.reject(refreshError)
    }
  },
)

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) return null

      const { data } = await axios.post<AuthTokens>(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })

      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
      return data.accessToken
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export const authApi = {
  register: (payload: { email: string; password: string; username: string; turnstileToken?: string }) =>
    api.post('/api/auth/register', payload),
  login: (payload: { email: string; password: string; turnstileToken?: string }) =>
    api.post('/api/auth/login', payload),
  forgotPassword: (email: string) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    api.post('/api/auth/reset-password', payload),
  verifyEmail: (token: string) => api.get('/api/auth/verify-email', { params: { token } }),
  linkDiscord: (payload: { code: string; state?: string }) => api.post('/api/auth/link-discord', payload),
  unlinkDiscord: () => api.post('/api/auth/unlink-discord'),
  discordStatus: () => api.get('/api/auth/discord-status'),
}

export const shopApi = {
  subscriptions: () => api.get('/api/shop/subscriptions'),
  products: () => api.get('/api/shop/products'),
  subscription: (id: string) => api.get(`/api/shop/subscriptions/${id}`),
  applyPromo: (code: string, amount: number) => api.post('/api/shop/apply-promo', { code, amount }),
  purchase: (payload: {
    items: Array<{ kind: 'subscription' | 'product'; id: string }>
    promoCode?: string
    paymentMethod?: string
    giftToUserId?: string
  }) => api.post('/api/shop/purchase', payload),
  mockComplete: (orderId: string) => api.post(`/api/shop/mock-complete/${orderId}`),
  mySubscriptions: () => api.get('/api/shop/user/subscriptions'),
  myPurchases: () => api.get('/api/shop/user/purchases'),
  testStatus: () => api.get('/api/shop/subscription/test'),
  activateTest: () => api.post('/api/shop/subscription/test'),
  cancel: (id: string) => api.post(`/api/shop/subscription/cancel/${id}`),
}

export const bonusApi = {
  dailyStatus: () => api.get('/api/bonus/daily'),
  claimDaily: () => api.post('/api/bonus/daily/claim'),
  redeemCode: (code: string) => api.post('/api/bonus/redeem', { code }),
}

export default api
