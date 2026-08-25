export interface Role {
  id: string
  discordId: string
  name: string
}

export interface User {
  id: string
  discordId: string
  username: string
  discriminator?: string | null
  avatar?: string | null
  email?: string | null
  roles: Role[]
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends AuthTokens {
  user: User
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
