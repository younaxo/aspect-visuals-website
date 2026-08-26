const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomChunk(): string {
  let chunk = ''
  for (let i = 0; i < 4; i += 1) {
    chunk += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return chunk
}

export function generateKey(): string {
  return `${randomChunk()}-${randomChunk()}-${randomChunk()}`
}

export function generateBatch(count: number): string[] {
  const keys = new Set<string>()
  const size = Math.max(0, Math.min(500, Math.floor(count)))
  let guard = 0
  while (keys.size < size && guard < size * 20) {
    keys.add(generateKey())
    guard += 1
  }
  return [...keys]
}

export function validateKey(value: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value.trim().toUpperCase())
}

export function normalizeKey(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function maskKey(value: string): string {
  const normalized = normalizeKey(value)
  if (!validateKey(normalized)) return '****-****-****'
  return `${normalized.slice(0, 9)}****`
}
