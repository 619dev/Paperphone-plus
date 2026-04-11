import { create } from 'zustand'

export interface User {
  id: string
  username: string
  nickname: string
  avatar?: string
  ik_pub?: string
  spk_pub?: string
  spk_sig?: string
  kem_pub?: string
}

export interface Friend {
  id: string
  username: string
  nickname: string
  avatar?: string
  is_online: boolean
  auto_delete: number
}

export interface ChatMessage {
  id: string
  from: string
  to?: string
  group_id?: string
  from_nickname?: string
  from_avatar?: string
  msg_type: string
  ciphertext: string
  header?: string
  self_ciphertext?: string
  self_header?: string
  ts: number
  read_at?: number
  offline?: boolean
  decrypted?: string
}

export interface Group {
  id: string
  name: string
  avatar?: string
  owner_id: string
  notice?: string
  auto_delete: number
  members?: GroupMember[]
}

export interface GroupMember {
  id: string
  username: string
  nickname: string
  avatar?: string
  role: string
  muted: boolean
}

interface AppStore {
  // Auth
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // Language
  lang: string
  setLang: (lang: string) => void

  // Friends
  friends: Friend[]
  setFriends: (friends: Friend[]) => void
  updateFriendOnline: (id: string, online: boolean) => void

  // Groups
  groups: Group[]
  setGroups: (groups: Group[]) => void

  // Chat Messages (keyed by chatId)
  messages: Record<string, ChatMessage[]>
  addMessage: (chatId: string, msg: ChatMessage) => void
  setMessages: (chatId: string, msgs: ChatMessage[]) => void
  prependMessages: (chatId: string, msgs: ChatMessage[]) => void

  // Unread counts
  unread: Record<string, number>
  incrementUnread: (chatId: string) => void
  clearUnread: (chatId: string) => void

  // WS
  wsConnected: boolean
  setWsConnected: (v: boolean) => void
}

export const useStore = create<AppStore>((set, get) => ({
  // Auth
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, friends: [], groups: [], messages: {}, unread: {} })
  },

  // Theme
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'light',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },

  // Language
  lang: localStorage.getItem('lang') || 'zh',
  setLang: (lang) => {
    localStorage.setItem('lang', lang)
    set({ lang })
  },

  // Friends
  friends: [],
  setFriends: (friends) => set({ friends }),
  updateFriendOnline: (id, online) => set(s => ({
    friends: s.friends.map(f => f.id === id ? { ...f, is_online: online } : f)
  })),

  // Groups
  groups: [],
  setGroups: (groups) => set({ groups }),

  // Messages
  messages: {},
  addMessage: (chatId, msg) => set(s => ({
    messages: {
      ...s.messages,
      [chatId]: [...(s.messages[chatId] || []), msg],
    }
  })),
  setMessages: (chatId, msgs) => set(s => ({
    messages: { ...s.messages, [chatId]: msgs }
  })),
  prependMessages: (chatId, msgs) => set(s => ({
    messages: {
      ...s.messages,
      [chatId]: [...msgs, ...(s.messages[chatId] || [])],
    }
  })),

  // Unread
  unread: {},
  incrementUnread: (chatId) => set(s => ({
    unread: { ...s.unread, [chatId]: (s.unread[chatId] || 0) + 1 }
  })),
  clearUnread: (chatId) => set(s => ({
    unread: { ...s.unread, [chatId]: 0 }
  })),

  // WS
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),
}))
