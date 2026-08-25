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
  TechnicalAdministrator: 'Technical Administrator',
  Administrator: 'Administrator',
  ChiefModerator: 'Chief Moderator',
  Moderator: 'Moderator',
  Support: 'Support',
  SubscriberPlus: 'Subscriber+',
  Subscriber: 'Subscriber',
  Default: 'Default',
}

const ROLE_PRIORITY: RoleKey[] = [
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

export function getHighestRole(user: User | null): Role | null {
  if (!user?.roles?.length) return null

  for (const key of ROLE_PRIORITY) {
    const match = user.roles.find((role) => role.discordId === DISCORD_ROLE_IDS[key])
    if (match) return match
  }

  return user.roles[0] ?? null
}

export function hasRole(user: User | null, roleKey: RoleKey): boolean {
  if (!user) return false
  return user.roles.some((role) => role.discordId === DISCORD_ROLE_IDS[roleKey])
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
