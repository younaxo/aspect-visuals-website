import type { Role, User } from '@prisma/client'
import { parseUid } from './uid'

export type PublicUser = Omit<User, 'discordAccessToken' | 'discordRefreshToken'> & {
  roles: Role[]
  uid: number | null
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
    roles: user.roles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
