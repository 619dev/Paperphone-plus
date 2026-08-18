function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const raw = atob(padded)
  return Uint8Array.from(raw, character => character.charCodeAt(0))
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const length = Math.min(left.length, right.length)
  for (let i = 0; i < length; i++) {
    if (left[i] !== right[i]) return left[i] - right[i]
  }
  return left.length - right.length
}

/**
 * Derive a symmetric safety number from the two public identity keys currently
 * published for a conversation. Presentation encryption is deliberately not
 * part of this calculation: it protects message bodies, not E2EE identities.
 */
export async function deriveSafetyNumber(leftKey: string, rightKey: string): Promise<string> {
  const left = decodeBase64Url(leftKey)
  const right = decodeBase64Url(rightKey)
  if (!left.length || !right.length) throw new Error('Identity key is empty')

  const [first, second] = compareBytes(left, right) <= 0 ? [left, right] : [right, left]
  const combined = new Uint8Array(first.length + second.length)
  combined.set(first)
  combined.set(second, first.length)

  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', combined))
  const groups: string[] = []
  for (let i = 0; i < 12; i++) {
    const offset = i * 2
    const value = (hash[offset] << 8) | hash[offset + 1]
    groups.push(String(value * 3 + i).padStart(5, '0').slice(-5))
  }
  return groups.join(' ')
}
