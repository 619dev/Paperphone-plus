import { useEffect, useRef, useState } from 'react'
import { CameraOff, ChevronLeft, LayoutGrid, Mic, MicOff, PhoneIncoming, PhoneOff, Presentation, Users, Video } from 'lucide-react'
import { formatDuration, useGroupCallContext } from '../contexts/GroupCallContext'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'

export default function GroupCallOverlay() {
  const gc = useGroupCallContext()
  const { t } = useI18n()
  const groups = useStore(s => s.groups)
  const [showPeople, setShowPeople] = useState(false)
  if (gc.status === 'idle') return gc.error ? <MeetingError message={gc.error} onClose={gc.cleanup} /> : null

  const group = groups.find(g => g.id === gc.groupId)
  const participants = Array.from(gc.peers.values())
  const title = gc.groupName || group?.name || t(gc.isVideo ? 'meeting.video_title' : 'meeting.voice_title')

  if (gc.status === 'ringing') return (
    <main style={shellStyle}>
      <div style={{ margin: 'auto', textAlign: 'center' }}>
        <Avatar name={gc.inviterName} src={gc.inviterAvatar} size={96} />
        <h2 style={{ margin: '20px 0 8px' }}>{title}</h2>
        <p style={{ color: '#a9b2c3' }}>{gc.inviterName} {t('meeting.invites_you')} {t(gc.isVideo ? 'meeting.video' : 'meeting.voice')}</p>
        <div style={{ display: 'flex', gap: 36, justifyContent: 'center', marginTop: 34 }}>
          <RoundButton label={t('meeting.reject')} color="#e5484d" onClick={gc.rejectGroupCall}><PhoneOff /></RoundButton>
          <RoundButton label={t('meeting.join')} color="#25a65a" onClick={gc.acceptGroupCall}><PhoneIncoming /></RoundButton>
        </div>
      </div>
    </main>
  )

  return (
    <main style={shellStyle}>
      <header style={headerStyle}>
        <button aria-label={t('meeting.leave')} onClick={gc.leaveGroupCall} style={iconButton}><ChevronLeft /></button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ color: '#a9b2c3', fontSize: 12 }}>
            {gc.status === 'connecting' ? t('meeting.joining') : `${formatDuration(gc.duration)} · ${participants.length + 1}/${gc.maxParticipants} ${t('meeting.people_unit')}`}
            {gc.meetingMode === 'lecture' && ` · ${t('meeting.lecture_mode')}`}
          </div>
        </div>
        <button onClick={() => setShowPeople(v => !v)} style={{ ...iconButton, marginLeft: 'auto' }}><Users size={20} /></button>
      </header>

      <section style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{ flex: 1, minWidth: 0, padding: 8 }}>
          <VideoStage gc={gc} participants={participants} />
        </div>
        {showPeople && <PeoplePanel gc={gc} participants={participants} />}
      </section>

      <footer style={footerStyle}>
        <Control label={t(gc.isMuted ? 'meeting.unmute' : 'meeting.mute')} active={gc.isMuted} disabled={gc.meetingMode === 'lecture' && !gc.isHost} onClick={gc.toggleMute}>
          {gc.isMuted ? <MicOff /> : <Mic />}
        </Control>
        {gc.isVideo && <Control label={t(gc.isCameraOff ? 'meeting.start_video' : 'meeting.stop_video')} active={gc.isCameraOff} onClick={gc.toggleCamera}>
          {gc.isCameraOff ? <CameraOff /> : <Video />}
        </Control>}
        {gc.isHost && <Control label={t('meeting.mute_all')} onClick={gc.muteAll}><MicOff /></Control>}
        {gc.isHost && <Control label={t(gc.meetingMode === 'lecture' ? 'meeting.discussion_mode' : 'meeting.lecture_mode')} active={gc.meetingMode === 'lecture'}
          onClick={() => gc.setMeetingMode(gc.meetingMode === 'lecture' ? 'discussion' : 'lecture')}><Presentation /></Control>}
        <Control label={t('meeting.leave')} danger onClick={gc.leaveGroupCall}><PhoneOff /></Control>
      </footer>
    </main>
  )
}

function VideoStage({ gc, participants }: { gc: ReturnType<typeof useGroupCallContext>; participants: any[] }) {
  const { t } = useI18n()
  const user = useStore(s => s.user)
  const tiles = [{ peerId: user?.id || 'local', nickname: `${user?.nickname || t('meeting.me')} (${t('meeting.me')})`, stream: gc.localStream,
    isMuted: gc.isMuted, isCameraOff: gc.isCameraOff, isHost: gc.isHost }, ...participants]
  const visible = gc.meetingMode === 'lecture'
    ? [...tiles].sort((a, b) => Number(b.isHost) - Number(a.isHost)).slice(0, 6)
    : tiles.slice(0, 16)
  const cols = visible.length <= 1 ? 1 : visible.length <= 4 ? 2 : visible.length <= 9 ? 3 : 4
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gridAutoRows: 'minmax(0, 1fr)', gap: 6, overflow: 'hidden' }}>
      {visible.map(p => <ParticipantTile key={p.peerId} participant={p} />)}
      {tiles.length > visible.length && <div style={moreTile}><LayoutGrid size={30} /><span>{t('meeting.more_people')} {tiles.length - visible.length}</span></div>}
    </div>
  )
}

function ParticipantTile({ participant: p }: { participant: any }) {
  const { t } = useI18n()
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (ref.current) ref.current.srcObject = p.stream }, [p.stream])
  const hasVideo = p.stream?.getVideoTracks().some((t: MediaStreamTrack) => t.enabled && t.readyState === 'live') && !p.isCameraOff
  return (
    <article style={{ position: 'relative', minHeight: 0, overflow: 'hidden', borderRadius: 10, background: '#151a22',
      display: 'flex', alignItems: 'center', justifyContent: 'center', border: p.isSpeaking ? '2px solid #38bdf8' : '2px solid transparent' }}>
      <video ref={ref} autoPlay playsInline muted={p.peerId === useStore.getState().user?.id} style={{ width: '100%', height: '100%', objectFit: 'cover', display: hasVideo ? 'block' : 'none' }} />
      {!hasVideo && <Avatar name={p.nickname} src={p.avatar} size={64} />}
      <span style={nameplate}>{p.nickname || p.peerId}{p.isHost && ` · ${t('meeting.host')}`} {p.isMuted && <MicOff size={12} />}</span>
    </article>
  )
}

function PeoplePanel({ gc, participants }: { gc: ReturnType<typeof useGroupCallContext>; participants: any[] }) {
  const { t } = useI18n()
  const user = useStore(s => s.user)
  return <aside style={{ width: 'min(320px, 42vw)', borderLeft: '1px solid #2b3442', padding: 14, overflowY: 'auto', background: '#111720' }}>
    <h3 style={{ margin: '4px 0 14px' }}>{t('meeting.participants')} ({participants.length + 1})</h3>
    {[{ peerId: user?.id, nickname: `${user?.nickname || t('meeting.me')} (${t('meeting.me')})`, avatar: user?.avatar, isMuted: gc.isMuted, isHost: gc.isHost }, ...participants].map(p =>
      <div key={p.peerId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <Avatar name={p.nickname} src={p.avatar} size={34} /><span style={{ flex: 1 }}>{p.nickname}</span>
        {p.isHost && <span style={{ fontSize: 11, color: '#65b7ff' }}>{t('meeting.host')}</span>}{p.isMuted ? <MicOff size={16} color="#a9b2c3" /> : <Mic size={16} />}
      </div>)}
  </aside>
}

function Avatar({ name, src, size }: { name?: string; src?: string; size: number }) {
  return <div style={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: '50%', background: '#36506d', display: 'grid', placeItems: 'center', fontSize: size * .4, overflow: 'hidden' }}>
    {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name?.[0] || '?')}
  </div>
}

function Control({ label, children, onClick, active, danger, disabled }: any) {
  return <button disabled={disabled} onClick={onClick} style={{ border: 0, color: '#fff', background: 'transparent', opacity: disabled ? .4 : 1, display: 'grid', justifyItems: 'center', gap: 5, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11 }}>
    <span style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: danger ? '#d93f45' : active ? '#eef2f6' : '#2a3442', color: active && !danger ? '#10151c' : '#fff' }}>{children}</span>{label}
  </button>
}
function RoundButton({ label, color, onClick, children }: any) { return <button onClick={onClick} style={{ border: 0, background: 'none', color: '#fff', display: 'grid', gap: 8, justifyItems: 'center', cursor: 'pointer' }}><span style={{ width: 64, height: 64, borderRadius: '50%', background: color, display: 'grid', placeItems: 'center' }}>{children}</span>{label}</button> }
function MeetingError({ message, onClose }: { message: string; onClose: () => void }) { const { t } = useI18n(); return <div style={{ position: 'fixed', left: '50%', bottom: 30, transform: 'translateX(-50%)', zIndex: 10001, padding: '12px 16px', borderRadius: 10, color: '#fff', background: '#a32931' }}>{message} <button onClick={onClose} style={{ marginLeft: 12 }}>{t('meeting.close')}</button></div> }

const shellStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column', background: '#0b1017', color: '#fff' }
const headerStyle: React.CSSProperties = { minHeight: 58, padding: 'calc(8px + env(safe-area-inset-top)) 12px 8px', display: 'flex', alignItems: 'center', gap: 10, background: '#111720', borderBottom: '1px solid #2b3442' }
const footerStyle: React.CSSProperties = { minHeight: 74, padding: '8px 14px calc(8px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(8px, 3vw, 24px)', background: '#111720', borderTop: '1px solid #2b3442', overflowX: 'auto' }
const iconButton: React.CSSProperties = { width: 40, height: 40, borderRadius: 10, border: 0, background: '#222c38', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }
const nameplate: React.CSSProperties = { position: 'absolute', left: 7, bottom: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 7px', borderRadius: 6, background: 'rgba(0,0,0,.58)' }
const moreTile: React.CSSProperties = { minHeight: 0, borderRadius: 10, background: '#151a22', color: '#a9b2c3', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center' }
