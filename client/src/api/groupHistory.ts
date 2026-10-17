import { SecurityError } from '../i18n/security'
import { get } from './http'
import type { ChatMessage } from '../store'

/** Page by immutable sequence, not timestamps (many messages share a second). */
export async function getGroupHistory(group: string): Promise<ChatMessage[]> {
  const pages: ChatMessage[][] = []
  let before: number | undefined
  while (true) {
    const page = await get<ChatMessage[]>(`/api/messages/group/${group}?limit=1000${before === undefined ? '' : `&before_seq=${before}`}`)
    if (!Array.isArray(page)) throw new SecurityError('crypto.invalid_history')
    if (!page.length) break
    const next = page[0].server_seq
    if (!Number.isSafeInteger(next) || next! < 1 || (before !== undefined && next! >= before)) throw new SecurityError('crypto.cursor_stalled')
    pages.push(page)
    before = next
    if (page.length < 1000) break
  }
  return pages.reverse().flat()
}
