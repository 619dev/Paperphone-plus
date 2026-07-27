export interface ReplyReference {
  id: string
  senderId: string
  senderName: string
  msgType: string
  preview: string
}

export interface MessagePayload {
  body: string
  reply?: ReplyReference
}

export function encodeMessagePayload(body: string, reply: ReplyReference | null): string {
  if (!reply) return body
  return JSON.stringify({ __paperphone_message: 1, body, reply })
}

export function decodeMessagePayload(value: string): MessagePayload {
  try {
    const parsed = JSON.parse(value)
    if (
      parsed?.__paperphone_message === 1
      && typeof parsed.body === 'string'
      && parsed.reply
      && typeof parsed.reply.id === 'string'
    ) {
      return { body: parsed.body, reply: parsed.reply }
    }
  } catch { /* legacy plaintext or media metadata */ }
  return { body: value }
}
