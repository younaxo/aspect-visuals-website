import type { Role, User } from '@prisma/client'

export type PublicUser = Omit<User, 'discordAccessToken' | 'discordRefreshToken'> & {
  roles: Role[]
}

export function toPublicUser(user: User & { roles: Role[] }): PublicUser {
  return {
    id: user.id,
    discordId: user.discordId,
    username: user.username,
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
