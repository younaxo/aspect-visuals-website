export interface Role {
  id: string
  discordId: string
  name: string
}

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline'
export type ThemePreference = 'dark' | 'light' | 'system'

export interface User {
  id: string
  discordId?: string | null
  username: string
  uid?: number | null
  discriminator?: string | null
  avatar?: string | null
  banner?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
  customStatus?: string | null
  status?: PresenceStatus
  email?: string | null
  isEmailVerified?: boolean
  discordLinked?: boolean
  roles: Role[]
  createdAt: string
  updatedAt: string
}

export interface UserSettings {
  id?: string
  userId?: string
  theme: ThemePreference
  notifications: boolean
  soundEnabled: boolean
  compactSidebar: boolean
  animations: boolean
  language: string
}

export interface SubscriptionPreview {
  id: string
  name: string
  expiresAt: string | null
}

export interface ProfileResponse {
  user: User
  settings: UserSettings
  subscriptions: SubscriptionPreview[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends AuthTokens {
  user: User
  settings?: UserSettings
}

export interface DiscordAuthUrl {
  url: string
}

export interface ApiError {
  message: string
  status?: number
}

export type RoleKey =
  | 'Owner'
  | 'Developer'
  | 'TechnicalAdministrator'
  | 'Administrator'
  | 'ChiefModerator'
  | 'Moderator'
  | 'Support'
  | 'SubscriberPlus'
  | 'Subscriber'
  | 'Default'
