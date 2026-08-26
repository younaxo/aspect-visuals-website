import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'
import type { AuthTokens } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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
    url.includes('/api/auth/logout')
  )
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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

export default api
