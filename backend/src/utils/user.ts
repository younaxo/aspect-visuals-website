import type { Role, User } from '@prisma/client'
import { parseUid } from './uid'

export type PublicUser = {
  id: string
  discordId: string | null
  username: string
  uid: number | null
  discriminator: string | null
  avatar: string | null
  banner: string | null
  bio: string | null
  location: string | null
  website: string | null
  customStatus: string | null
  status: string
  email: string | null
  isEmailVerified: boolean
  discordLinked: boolean
  roles: Role[]
  balance: number
  createdAt: Date
  updatedAt: Date
}

export function toPublicUser(user: User & { roles: Role[] }): PublicUser {
  return {
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    uid: parseUid(user.discriminator),
    discriminator: user.discriminator,
    avatar: user.avatar,
    banner: user.banner,
    bio: user.bio,
    location: user.location,
    website: user.website,
    customStatus: user.customStatus,
    status: user.status,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    discordLinked: user.discordLinked,
    roles: user.roles,
    balance: Number(user.balance ?? 0),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
