import type { Role, RoleKey, User } from '../types'

export const DISCORD_ROLE_IDS: Record<RoleKey, string> = {
  Owner: '1541875062208995328',
  Developer: '1541784961986596874',
  TechnicalAdministrator: '1541875599331561604',
  Administrator: '1541785126856429568',
  ChiefModerator: '1541785097374793799',
  Moderator: '1541785042706235472',
  Support: '1541785160297480243',
  SubscriberPlus: '1541875642524766290',
  Subscriber: '1541790489399791716',
  Default: '1541869586004058264',
}

export const DISCORD_ROLE_LABELS: Record<RoleKey, string> = {
  Owner: 'Owner',
  Developer: 'Developer',
  TechnicalAdministrator: 'Tech.Admin',
  Administrator: 'Admin',
  ChiefModerator: 'Chief Mod',
  Moderator: 'Mod.',
  Support: 'Media',
  SubscriberPlus: 'Sub Pl',
  Subscriber: 'Sub',
  Default: 'Def',
}

export const ROLE_PRIORITY: RoleKey[] = [
  'Owner',
  'Developer',
  'TechnicalAdministrator',
  'Administrator',
  'ChiefModerator',
  'Moderator',
  'Support',
  'SubscriberPlus',
  'Subscriber',
  'Default',
]

export function getRoleKeyByDiscordId(discordId: string): RoleKey | undefined {
  return (Object.keys(DISCORD_ROLE_IDS) as RoleKey[]).find(
    (key) => DISCORD_ROLE_IDS[key] === discordId,
  )
}

export function getHighestRoleKey(user: User | null): RoleKey | undefined {
  const role = getHighestRole(user)
  return role ? getRoleKeyByDiscordId(role.discordId) : undefined
}

export const ROLE_ICON_FILES: Partial<Record<RoleKey, string>> = {
  Owner: 'owner.png',
  Developer: 'developer.png',
  TechnicalAdministrator: 'technical_administrator.png',
  Administrator: 'administrator.png',
  ChiefModerator: 'chief_moderator.png',
  Moderator: 'moderator.png',
  Support: 'support.png',
  SubscriberPlus: 'subcriber_plus.png',
  Subscriber: 'subcriber.png',
}

const ROLE_ICON_BASE = 'https://cdn-files.aspectvisuals.su/assets/images/profile-assets/roles_icon'

export function getRoleIconUrl(roleKey?: RoleKey): string | null {
  if (!roleKey) return null
  const file = ROLE_ICON_FILES[roleKey]
  return file ? `${ROLE_ICON_BASE}/${file}` : null
}

export function sortRolesByHierarchy(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => {
    const ia = ROLE_PRIORITY.findIndex((key) => DISCORD_ROLE_IDS[key] === a.discordId)
    const ib = ROLE_PRIORITY.findIndex((key) => DISCORD_ROLE_IDS[key] === b.discordId)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

export function getHighestRole(user: User | null): Role | null {
  if (!user?.roles?.length) return null
  return sortRolesByHierarchy(user.roles)[0] ?? null
}

export function hasRole(user: User | null, roleKey: RoleKey): boolean {
  if (!user) return false
  return user.roles.some((role) => role.discordId === DISCORD_ROLE_IDS[roleKey])
}

export function isAdmin(user: User | null): boolean {
  return (
    hasRole(user, 'Owner') ||
    hasRole(user, 'Developer') ||
    hasRole(user, 'TechnicalAdministrator') ||
    hasRole(user, 'Administrator')
  )
}

export function isPanelAdmin(user: User | null): boolean {
  return (
    hasRole(user, 'Owner') ||
    hasRole(user, 'Developer') ||
    hasRole(user, 'TechnicalAdministrator')
  )
}

export function isStaff(user: User | null): boolean {
  return (
    hasRole(user, 'Owner') ||
    hasRole(user, 'Developer') ||
    hasRole(user, 'TechnicalAdministrator') ||
    hasRole(user, 'Administrator') ||
    hasRole(user, 'ChiefModerator') ||
    hasRole(user, 'Moderator') ||
    hasRole(user, 'Support')
  )
}
