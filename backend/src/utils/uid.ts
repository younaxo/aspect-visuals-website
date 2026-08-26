import { prisma } from './prisma'

const RESERVED_UIDS: Array<{ names: string[]; uid: number }> = [
  { names: ['kleekyt'], uid: 0 },
  { names: ['younaxo'], uid: 1 },
]

function normalizeName(name?: string | null): string {
  return (name ?? '').trim().toLowerCase().replace(/\.+$/, '')
}

function reservedUidFor(...names: Array<string | null | undefined>): number | null {
  const candidates = names.map(normalizeName).filter(Boolean)
  for (const entry of RESERVED_UIDS) {
    if (entry.names.some((name) => candidates.includes(name))) return entry.uid
  }
  return null
}

export function parseUid(discriminator?: string | null): number | null {
  if (discriminator == null || discriminator === '') return null
  if (!/^\d+$/.test(discriminator)) return null
  return Number(discriminator)
}

async function takeUid(userId: string, uid: number): Promise<boolean> {
  if (uid !== 0) {
    const taken = await prisma.user.findFirst({
      where: { discriminator: String(uid), NOT: { id: userId } },
      select: { id: true },
    })
    if (taken) return false
  }

  await prisma.user.update({ where: { id: userId }, data: { discriminator: String(uid) } })
  return true
}

export async function ensureUserUid(
  userId: string,
  names: { username: string; discordUsername?: string | null },
): Promise<number> {
  const current = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { discriminator: true },
  })

  const reserved = reservedUidFor(names.discordUsername, names.username)
  const parsed = parseUid(current.discriminator)

  // Discord теперь отдаёт discriminator "0" всем — это не наш UID, кроме KleekYT
  const hasSiteUid = parsed !== null && (parsed !== 0 || reserved === 0)

  if (reserved !== null) {
    if (parsed === reserved) return reserved
    if (await takeUid(userId, reserved)) return reserved
  }

  if (hasSiteUid && parsed !== null) return parsed

  const users = await prisma.user.findMany({ select: { discriminator: true } })
  const used = new Set(
    users
      .map((user) => parseUid(user.discriminator))
      .filter((value): value is number => value !== null && value !== 0),
  )

  let next = 2
  while (used.has(next)) next += 1
  if (await takeUid(userId, next)) return next

  throw new Error('Не удалось выдать уникальный UID')
}
