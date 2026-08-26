export const ROLE_IDS = {
  Owner: '1541875062208995328',
  Developer: '1541784961986596874',
  TechnicalAdministrator: '1541875599331561604',
  Administrator: '1541785126856429568',
  ChiefModerator: '1541785097374793799',
  Moderator: '1541785042706235472',
  Support: '1541785160297480243',
} as const

const ADMIN_CHANNELS = new Set<string>([
  ROLE_IDS.Owner,
  ROLE_IDS.Developer,
  ROLE_IDS.TechnicalAdministrator,
  ROLE_IDS.Administrator,
])

const MOD_CHANNELS = new Set<string>([
  ...ADMIN_CHANNELS,
  ROLE_IDS.ChiefModerator,
  ROLE_IDS.Moderator,
])

export type ChatChannel = 'general' | 'moderator' | 'admin'

export function isChatChannel(value: string): value is ChatChannel {
  return value === 'general' || value === 'moderator' || value === 'admin'
}

export function canAccessChannel(roleDiscordIds: string[], channel: string): boolean {
  if (channel === 'general') return true
  if (channel === 'moderator') return roleDiscordIds.some((id) => MOD_CHANNELS.has(id))
  if (channel === 'admin') return roleDiscordIds.some((id) => ADMIN_CHANNELS.has(id))
  return false
}

export function accessibleChannels(roleDiscordIds: string[]): ChatChannel[] {
  const list: ChatChannel[] = ['general']
  if (canAccessChannel(roleDiscordIds, 'moderator')) list.push('moderator')
  if (canAccessChannel(roleDiscordIds, 'admin')) list.push('admin')
  return list
}

export function isStaffRoles(roleDiscordIds: string[]): boolean {
  return roleDiscordIds.some((id) => MOD_CHANNELS.has(id) || id === ROLE_IDS.Support)
}

export function isAdminRoles(roleDiscordIds: string[]): boolean {
  return roleDiscordIds.some((id) => ADMIN_CHANNELS.has(id))
}

const PANEL_ROLES = new Set<string>([
  ROLE_IDS.Owner,
  ROLE_IDS.Developer,
  ROLE_IDS.TechnicalAdministrator,
])

export function isPanelAdminRoles(roleDiscordIds: string[]): boolean {
  return roleDiscordIds.some((id) => PANEL_ROLES.has(id))
}

export function isOwnerRole(roleDiscordIds: string[]): boolean {
  return roleDiscordIds.includes(ROLE_IDS.Owner)
}
