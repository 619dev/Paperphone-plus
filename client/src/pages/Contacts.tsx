import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { get, post, del } from '../api/http'
import { useStore, Friend } from '../store'
import { useI18n } from '../hooks/useI18n'

type Tab = 'friends' | 'groups' | 'requests' | 'tags'

interface Tag {
  id: number
  name: string
  color: string
}

// tag_id (string key from JSON) → friend_id[]
type AssignmentMap = Record<string, string[]>

export default function Contacts() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const friends = useStore(s => s.friends)
  const groups = useStore(s => s.groups)
  const setFriends = useStore(s => s.setFriends)
  const setGroups = useStore(s => s.setGroups)

  const [tab, setTab] = useState<Tab>('friends')
  const [requests, setRequests] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Tags state
  const [tags, setTags] = useState<Tag[]>([])
  const [assignments, setAssignments] = useState<AssignmentMap>({})
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#2196F3')
  const [showTagCreate, setShowTagCreate] = useState(false)

  // Tag management sub-views
  const [editingTag, setEditingTag] = useState<Tag | null>(null) // assign friends to tag
  const [filterTag, setFilterTag] = useState<Tag | null>(null) // filter friends by tag

  // Friends tab: group by tag toggle
  const [groupByTag, setGroupByTag] = useState(false)

  useEffect(() => {
    get<Friend[]>('/api/friends').then(setFriends).catch(() => {})
    get('/api/groups').then(setGroups).catch(() => {})
    get('/api/friends/requests').then(setRequests).catch(() => {})
    loadTagData()
  }, [])

  const loadTagData = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([
        get<Tag[]>('/api/tags'),
        get<AssignmentMap>('/api/tags/assignments'),
      ])
      setTags(t)
      setAssignments(a)
    } catch {}
  }, [])

  // Build reverse map: friend_id → Tag[]
  const friendTagMap = useCallback((): Record<string, Tag[]> => {
    const map: Record<string, Tag[]> = {}
    for (const tag of tags) {
      const friendIds = assignments[String(tag.id)] || []
      for (const fid of friendIds) {
        if (!map[fid]) map[fid] = []
        map[fid].push(tag)
      }
    }
    return map
  }, [tags, assignments])

  const searchUsers = async () => {
    if (!searchQ.trim()) return
    try {
      const res = await get(`/api/users/search?q=${encodeURIComponent(searchQ)}`)
      setSearchResults(res)
    } catch {}
  }

  const sendFriendRequest = async (friendId: string) => {
    try {
      await post('/api/friends/request', { friend_id: friendId })
      searchUsers()
    } catch {}
  }

  const acceptRequest = async (friendId: string) => {
    try {
      await post('/api/friends/accept', { friend_id: friendId })
      setRequests(prev => prev.filter(r => r.id !== friendId))
      get<Friend[]>('/api/friends').then(setFriends).catch(() => {})
    } catch {}
  }

  const createTag = async () => {
    if (!newTagName.trim()) return
    try {
      const res = await post<Tag>('/api/tags', { name: newTagName, color: newTagColor })
      setTags(prev => [...prev, res])
      setNewTagName('')
      setShowTagCreate(false)
    } catch {}
  }

  const deleteTag = async (id: number) => {
    try {
      await del(`/api/tags/${id}`)
      setTags(prev => prev.filter(t => t.id !== id))
      const newAssign = { ...assignments }
      delete newAssign[String(id)]
      setAssignments(newAssign)
      if (editingTag?.id === id) setEditingTag(null)
      if (filterTag?.id === id) setFilterTag(null)
    } catch {}
  }

  const toggleFriendTag = async (tagId: number, friendId: string) => {
    const key = String(tagId)
    const current = assignments[key] || []
    const isAssigned = current.includes(friendId)
    try {
      if (isAssigned) {
        await post(`/api/tags/${tagId}/unassign`, { friend_id: friendId })
        setAssignments(prev => ({
          ...prev,
          [key]: (prev[key] || []).filter(id => id !== friendId),
        }))
      } else {
        await post(`/api/tags/${tagId}/assign`, { friend_id: friendId })
        setAssignments(prev => ({
          ...prev,
          [key]: [...(prev[key] || []), friendId],
        }))
      }
    } catch {}
  }

  const TAG_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B']

  // ═══════════════════════════════════════════════════════════════════
  // SUB-VIEW: Assign friends to a tag (multi-select)
  // ═══════════════════════════════════════════════════════════════════
  if (editingTag) {
    const tagFriends = assignments[String(editingTag.id)] || []
    return (
      <div className="page" id="contacts-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => setEditingTag(null)}>←</button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: editingTag.color, display: 'inline-block' }} />
            {editingTag.name}
          </h1>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            {tagFriends.length} {t('tags.assigned_count')}
          </span>
        </div>
        <div className="page-body">
          <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{t('tags.select_friends')}</div>
          {friends.map(f => {
            const assigned = tagFriends.includes(f.id)
            return (
              <div key={f.id} className="list-item" onClick={() => toggleFriendTag(editingTag.id, f.id)} style={{ cursor: 'pointer' }}>
                <div className="avatar avatar-sm" style={{ position: 'relative' }}>
                  {f.avatar ? <img src={f.avatar} alt="" /> : f.nickname[0]?.toUpperCase()}
                </div>
                <div className="list-content">
                  <div className="name">{f.nickname}</div>
                  <div className="preview">@{f.username}</div>
                </div>
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: assigned ? 'none' : '2px solid var(--text-muted)',
                  background: assigned ? editingTag.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}>
                  {assigned ? '✓' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // SUB-VIEW: Filter friends by tag
  // ═══════════════════════════════════════════════════════════════════
  if (filterTag) {
    const tagFriendIds = assignments[String(filterTag.id)] || []
    const filtered = friends.filter(f => tagFriendIds.includes(f.id))
    const ftm = friendTagMap()
    return (
      <div className="page" id="contacts-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => setFilterTag(null)}>←</button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: filterTag.color, display: 'inline-block' }} />
            {filterTag.name}
          </h1>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
            {filtered.length}
          </span>
        </div>
        <div className="page-body">
          {filtered.map(f => (
            <div key={f.id} className="list-item" onClick={() => navigate(`/chat/${f.id}`)}>
              <div className="avatar" style={{ position: 'relative' }}>
                {f.avatar ? <img src={f.avatar} alt="" /> : f.nickname[0]?.toUpperCase()}
                {f.is_online && <span className="online-dot" />}
              </div>
              <div className="list-content">
                <div className="name">{f.nickname}</div>
                <div className="preview">@{f.username}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 100 }}>
                {(ftm[f.id] || []).map(tg => (
                  <span key={tg.id} style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 8,
                    background: tg.color + '22', color: tg.color, fontWeight: 600,
                  }}>{tg.name}</span>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="icon">🏷️</div>
              <div>{t('tags.no_friends_in_tag')}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Build grouped friends for "group by tag" view
  const ftm = friendTagMap()
  const groupedSections: { tag: Tag; friends: Friend[] }[] = tags.map(tag => ({
    tag,
    friends: friends.filter(f => (assignments[String(tag.id)] || []).includes(f.id)),
  })).filter(s => s.friends.length > 0)

  // Friends without any tag
  const untaggedFriends = friends.filter(f => !ftm[f.id] || ftm[f.id].length === 0)

  // ═══════════════════════════════════════════════════════════════════
  // MAIN VIEW
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="page" id="contacts-page">
      <div className="page-header">
        <h1>{t('contacts.title')}</h1>
        <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(!showAdd)} style={{ marginLeft: 'auto' }}>
          {showAdd ? '✕' : '➕'}
        </button>
      </div>

      {showAdd && (
        <div style={{ padding: '8px 16px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input" id="search-user-input"
              placeholder={t('contacts.search_user')}
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUsers()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={searchUsers}>{t('common.search')}</button>
          </div>
          {searchResults.map(u => (
            <div key={u.id} className="list-item">
              <div className="avatar avatar-sm">{u.avatar ? <img src={u.avatar} alt="" /> : u.nickname?.[0]}</div>
              <div className="list-content">
                <div className="name">{u.nickname}</div>
                <div className="preview">@{u.username}</div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => sendFriendRequest(u.id)}>
                {t('contacts.add_friend')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['friends', 'groups', 'requests', 'tags'] as const).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              color: tab === tb ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === tb ? '2px solid var(--accent)' : 'none',
              fontWeight: tab === tb ? 600 : 400, fontSize: 14, cursor: 'pointer',
            }}
          >
            {t(`contacts.${tb}`)}
            {tb === 'requests' && requests.length > 0 && ` (${requests.length})`}
          </button>
        ))}
      </div>

      <div className="page-body">
        {/* ── Friends Tab ─────────────────────────────── */}
        {tab === 'friends' && (
          <>
            {/* Group-by-tag toggle */}
            {tags.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🏷️ {t('tags.group_by_tag')}</span>
                <div
                  className={`toggle ${groupByTag ? 'active' : ''}`}
                  onClick={() => setGroupByTag(!groupByTag)}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            )}

            {!groupByTag ? (
              // Flat list
              friends.map(f => (
                <div key={f.id} className="list-item" onClick={() => navigate(`/chat/${f.id}`)}>
                  <div className="avatar" style={{ position: 'relative' }}>
                    {f.avatar ? <img src={f.avatar} alt="" /> : f.nickname[0]?.toUpperCase()}
                    {f.is_online && <span className="online-dot" />}
                  </div>
                  <div className="list-content">
                    <div className="name">{f.nickname}</div>
                    <div className="preview" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>@{f.username}</span>
                      {(ftm[f.id] || []).map(tg => (
                        <span key={tg.id} style={{
                          fontSize: 9, padding: '0px 5px', borderRadius: 6,
                          background: tg.color + '22', color: tg.color, fontWeight: 600,
                        }}>{tg.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Grouped by tag
              <>
                {groupedSections.map(({ tag, friends: taggedFriends }) => (
                  <div key={tag.id}>
                    <div style={{
                      padding: '10px 16px 4px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, fontWeight: 600, color: tag.color,
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: 5, background: tag.color }} />
                      {tag.name}
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>({taggedFriends.length})</span>
                    </div>
                    {taggedFriends.map(f => (
                      <div key={f.id} className="list-item" onClick={() => navigate(`/chat/${f.id}`)}>
                        <div className="avatar" style={{ position: 'relative' }}>
                          {f.avatar ? <img src={f.avatar} alt="" /> : f.nickname[0]?.toUpperCase()}
                          {f.is_online && <span className="online-dot" />}
                        </div>
                        <div className="list-content">
                          <div className="name">{f.nickname}</div>
                          <div className="preview">@{f.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {untaggedFriends.length > 0 && (
                  <div>
                    <div style={{
                      padding: '10px 16px 4px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
                    }}>
                      {t('tags.untagged')}
                      <span style={{ fontWeight: 400, fontSize: 12 }}>({untaggedFriends.length})</span>
                    </div>
                    {untaggedFriends.map(f => (
                      <div key={f.id} className="list-item" onClick={() => navigate(`/chat/${f.id}`)}>
                        <div className="avatar" style={{ position: 'relative' }}>
                          {f.avatar ? <img src={f.avatar} alt="" /> : f.nickname[0]?.toUpperCase()}
                          {f.is_online && <span className="online-dot" />}
                        </div>
                        <div className="list-content">
                          <div className="name">{f.nickname}</div>
                          <div className="preview">@{f.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {friends.length === 0 && (
              <div className="empty-state"><div className="icon">👥</div><div>{t('contacts.empty')}</div></div>
            )}
          </>
        )}

        {/* ── Groups Tab ─────────────────────────────── */}
        {tab === 'groups' && (
          <>
            <div style={{ padding: 16 }}>
              <button className="btn btn-primary btn-full" onClick={() => {/* TODO: Create group modal */}}>
                {t('group.create')}
              </button>
            </div>
            {groups.map(g => (
              <div key={g.id} className="list-item" onClick={() => navigate(`/chat/${g.id}?group=1`)}>
                <div className="avatar">{g.avatar ? <img src={g.avatar} alt="" /> : '👥'}</div>
                <div className="list-content">
                  <div className="name">{g.name}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Requests Tab ───────────────────────────── */}
        {tab === 'requests' && requests.map(r => (
          <div key={r.id} className="list-item">
            <div className="avatar">{r.avatar ? <img src={r.avatar} alt="" /> : r.nickname?.[0]}</div>
            <div className="list-content">
              <div className="name">{r.nickname}</div>
              {r.message && <div className="preview">{r.message}</div>}
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => acceptRequest(r.id)}>
              {t('contacts.accept')}
            </button>
          </div>
        ))}

        {/* ── Tags Tab ───────────────────────────────── */}
        {tab === 'tags' && (
          <>
            <div style={{ padding: 16 }}>
              {showTagCreate ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="input" placeholder={t('tags.name')} value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTag()} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TAG_COLORS.map(c => (
                      <div
                        key={c}
                        onClick={() => setNewTagColor(c)}
                        style={{
                          width: 28, height: 28, borderRadius: 14, background: c, cursor: 'pointer',
                          border: c === newTagColor ? '3px solid var(--text)' : '3px solid transparent',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowTagCreate(false)}>{t('common.cancel')}</button>
                    <button className="btn btn-primary btn-sm" onClick={createTag}>{t('common.save')}</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary btn-full" onClick={() => setShowTagCreate(true)}>
                  ➕ {t('tags.create')}
                </button>
              )}
            </div>

            {tags.map(tag => {
              const count = (assignments[String(tag.id)] || []).length
              return (
                <div key={tag.id} className="list-item" style={{ cursor: 'pointer' }}>
                  {/* Click color dot to filter */}
                  <div
                    onClick={() => setFilterTag(tag)}
                    style={{ width: 16, height: 16, borderRadius: 8, background: tag.color, marginRight: 12, flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div className="list-content" onClick={() => setFilterTag(tag)}>
                    <div className="name">{tag.name}</div>
                    <div className="preview">{count} {t('tags.friends_count')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={e => { e.stopPropagation(); setEditingTag(tag) }}
                      style={{ padding: '2px 8px', fontSize: 12 }}
                    >
                      ✎
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={e => { e.stopPropagation(); deleteTag(tag.id) }}
                      style={{ padding: '2px 8px', fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}

            {tags.length === 0 && !showTagCreate && (
              <div className="empty-state">
                <div className="icon">🏷️</div>
                <div>{t('tags.empty')}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
