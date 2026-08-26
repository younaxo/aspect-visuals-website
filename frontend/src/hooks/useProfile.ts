import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import api from '../api'
import { useAuthStore } from '../store/authStore'
import type { ProfileResponse, User, UserSettings } from '../types'

interface UploadResult {
  url: string
  kind: 'avatars' | 'banners'
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function useProfile() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const storeUser = useAuthStore((state) => state.user)
  const storeSettings = useAuthStore((state) => state.settings)
  const { updateUser, setSettings } = useAuthStore()

  const applyPayload = (data: ProfileResponse) => {
    updateUser(data.user)
    setSettings(data.settings)
    queryClient.setQueryData(['auth', 'me'], data.user)
    queryClient.setQueryData(['profile'], data)
  }

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>('/api/profile')
      applyPayload(data)
      return data
    },
    enabled: Boolean(accessToken),
    staleTime: 60_000,
  })

  const updateProfile = useMutation({
    mutationFn: async (payload: Partial<User>) => {
      const { data } = await api.put<ProfileResponse>('/api/profile', payload)
      return data
    },
    onSuccess: applyPayload,
  })

  const updateAvatar = useMutation({
    mutationFn: async (avatar: string | null) => {
      const { data } = await api.put<ProfileResponse>('/api/profile/avatar', { avatar })
      return data
    },
    onSuccess: applyPayload,
  })

  const updateBanner = useMutation({
    mutationFn: async (banner: string | null) => {
      const { data } = await api.put<ProfileResponse>('/api/profile/banner', { banner })
      return data
    },
    onSuccess: applyPayload,
  })

  const updateSettings = useMutation({
    mutationFn: async (payload: Partial<UserSettings>) => {
      const { data } = await api.put<{ settings: UserSettings }>('/api/settings', payload)
      return data.settings
    },
    onSuccess: (settings) => {
      setSettings(settings)
      queryClient.setQueryData(['settings'], settings)
    },
  })

  const uploadFile = async (file: File, kind: 'avatar' | 'banner') => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<UploadResult>(`/api/profile/upload?kind=${kind}`, form)
    return data.url
  }

  const uploadAvatar = async (file: File) => {
    try {
      const url = await uploadFile(file, 'avatar')
      await updateAvatar.mutateAsync(url)
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Не удалось загрузить аватар'))
    }
  }

  const uploadBanner = async (file: File) => {
    try {
      const url = await uploadFile(file, 'banner')
      await updateBanner.mutateAsync(url)
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Не удалось загрузить баннер'))
    }
  }

  const saveProfile = async (payload: Partial<User>) => {
    try {
      return await updateProfile.mutateAsync(payload)
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Не удалось сохранить профиль'))
    }
  }

  const saveSettings = async (payload: Partial<UserSettings>) => {
    try {
      return await updateSettings.mutateAsync(payload)
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Не удалось сохранить настройки'))
    }
  }

  return {
    profile: profileQuery.data,
    user: profileQuery.data?.user ?? storeUser,
    subscriptions: profileQuery.data?.subscriptions ?? [],
    settings: profileQuery.data?.settings ?? storeSettings,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    saveProfile,
    saveSettings,
    uploadAvatar,
    uploadBanner,
    removeAvatar: () => updateAvatar.mutateAsync(null),
    removeBanner: () => updateBanner.mutateAsync(null),
    isSaving:
      updateProfile.isPending ||
      updateAvatar.isPending ||
      updateBanner.isPending ||
      updateSettings.isPending,
  }
}
