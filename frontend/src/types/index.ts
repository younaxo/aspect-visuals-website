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

export interface ShopSubscription {
  id: string
  name: string
  description: string | null
  price: number
  duration: number
  type: string
  popular?: boolean
  badge?: string | null
}

export interface ShopProduct {
  id: string
  name: string
  description: string | null
  price: number
  type: string
  giftable: boolean
}

export interface UserShopSubscription {
  id: string
  subscriptionId: string
  name: string
  type: string
  startDate: string
  endDate: string
  isActive: boolean
  status: 'active' | 'expiring' | 'expired'
  lifetime: boolean
}

export interface TestSubscriptionInfo {
  available: boolean
  reason: string | null
  lastActivatedAt: string | null
  nextAvailableAt: string | null
}

export interface ShopPurchase {
  id: string
  amount: number
  status: string
  createdAt: string
  completedAt: string | null
  name: string
  kind: 'subscription' | 'product'
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
