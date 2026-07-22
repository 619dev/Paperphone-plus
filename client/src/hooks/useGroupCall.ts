/** Scalable group meetings backed by a LiveKit SFU (one connection per client). */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConnectionState, LocalParticipant, Participant, RemoteParticipant, Room, RoomEvent,
  Track, type RemoteTrack, type RemoteTrackPublication,
} from 'livekit-client'
import { post } from '../api/http'
import { onWs, sendWs } from '../api/socket'
import { playCallRingtone, showBrowserNotification, stopRingtone } from '../utils/notification'
import { useI18n } from './useI18n'

export type GroupCallStatus = 'idle' | 'ringing' | 'connecting' | 'connected'
export type MeetingMode = 'discussion' | 'lecture'
export type VoiceMode = 'normal' | 'slow' | 'fast'

export interface PeerInfo {
  peerId: string
  nickname?: string
  avatar?: string
  stream: MediaStream | null
  isMuted: boolean
  isCameraOff: boolean
  isSpeaking: boolean
  isHost: boolean
}

type TokenResponse = { url: string; token: string; is_host: boolean; max_participants: number }
type MeetingCommand = { kind: 'mute-all' | 'mode'; mode?: MeetingMode }

const decoder = new TextDecoder()
const encoder = new TextEncoder()

export function useGroupCall(userId: string | undefined) {
  const { t } = useI18n()
  const [status, setStatus] = useState<GroupCallStatus>('idle')
  const [callId, setCallId] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [duration, setDuration] = useState(0)
  const [peers, setPeers] = useState<Map<string, PeerInfo>>(new Map())
  const [inviterName, setInviterName] = useState('')
  const [inviterAvatar, setInviterAvatar] = useState('')
  const [groupName, setGroupName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [meetingMode, setMeetingMode] = useState<MeetingMode>('discussion')
  const [error, setError] = useState('')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  const roomRef = useRef<Room | null>(null)
  const callIdRef = useRef<string | null>(null)
  const groupIdRef = useRef<string | null>(null)
  const statusRef = useRef<GroupCallStatus>('idle')
  const videoRef = useRef(false)
  const hostRef = useRef(false)
  const modeRef = useRef<MeetingMode>('discussion')
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  callIdRef.current = callId
  groupIdRef.current = groupId
  statusRef.current = status
  videoRef.current = isVideo
  hostRef.current = isHost
  modeRef.current = meetingMode

  const metadata = (p: Participant) => {
    try { return JSON.parse(p.metadata || '{}') } catch { return {} }
  }

  const participantStream = (p: RemoteParticipant) => {
    const tracks: MediaStreamTrack[] = []
    p.trackPublications.forEach(pub => { if (pub.track?.mediaStreamTrack) tracks.push(pub.track.mediaStreamTrack) })
    return tracks.length ? new MediaStream(tracks) : null
  }

  const syncPeers = useCallback((room: Room) => {
    const next = new Map<string, PeerInfo>()
    room.remoteParticipants.forEach(p => {
      const meta = metadata(p)
      next.set(p.identity, {
        peerId: p.identity, nickname: p.name || p.identity, avatar: meta.avatar,
        stream: participantStream(p), isMuted: !p.isMicrophoneEnabled,
        isCameraOff: !p.isCameraEnabled, isSpeaking: p.isSpeaking, isHost: meta.host === true,
      })
    })
    setPeers(next)
  }, [])

  const syncLocalStream = (participant: LocalParticipant) => {
    const tracks: MediaStreamTrack[] = []
    participant.trackPublications.forEach(pub => { if (pub.track?.mediaStreamTrack) tracks.push(pub.track.mediaStreamTrack) })
    setLocalStream(tracks.length ? new MediaStream(tracks) : null)
  }

  const applyMute = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    await room.localParticipant.setMicrophoneEnabled(false)
    setIsMuted(true)
    syncLocalStream(room.localParticipant)
  }, [])

  const sendCommand = useCallback(async (command: MeetingCommand) => {
    if (!hostRef.current || !roomRef.current) return
    await roomRef.current.localParticipant.publishData(encoder.encode(JSON.stringify(command)), {
      reliable: true, topic: 'paperphone-meeting-control',
    })
  }, [])

  const cleanup = useCallback(() => {
    stopRingtone()
    if (durationTimer.current) clearInterval(durationTimer.current)
    durationTimer.current = null
    const room = roomRef.current
    roomRef.current = null
    if (room) room.disconnect()
    setStatus('idle'); setCallId(null); setGroupId(null); setIsVideo(false)
    setIsMuted(false); setIsCameraOff(false); setDuration(0); setPeers(new Map())
    setLocalStream(null); setInviterName(''); setInviterAvatar(''); setGroupName('')
    setIsHost(false); setMeetingMode('discussion')
    setError('')
  }, [])

  const connectMeeting = useCallback(async (gid: string, cid: string, video: boolean) => {
    setError('')
    const auth = await post<TokenResponse>('/api/calls/meeting-token', { group_id: gid, call_id: cid })
    const room = new Room({ adaptiveStream: true, dynacast: true, disconnectOnPageLeave: true })
    roomRef.current = room
    setIsHost(auth.is_host)

    const refresh = () => syncPeers(room)
    room.on(RoomEvent.ParticipantConnected, async () => {
      refresh()
      if (hostRef.current) await sendCommand({ kind: 'mode', mode: modeRef.current })
    })
    room.on(RoomEvent.ParticipantDisconnected, refresh)
    room.on(RoomEvent.TrackSubscribed, (_t: RemoteTrack, _p: RemoteTrackPublication, _rp: RemoteParticipant) => refresh())
    room.on(RoomEvent.TrackUnsubscribed, refresh)
    room.on(RoomEvent.TrackMuted, refresh)
    room.on(RoomEvent.TrackUnmuted, refresh)
    room.on(RoomEvent.ActiveSpeakersChanged, refresh)
    room.on(RoomEvent.DataReceived, async (payload, participant, _kind, topic) => {
      if (topic !== 'paperphone-meeting-control' || !participant || metadata(participant).host !== true) return
      try {
        const command = JSON.parse(decoder.decode(payload)) as MeetingCommand
        if (command.kind === 'mute-all') await applyMute()
        if (command.kind === 'mode' && command.mode) {
          setMeetingMode(command.mode)
          if (command.mode === 'lecture') await applyMute()
        }
      } catch { /* malformed control packet */ }
    })
    room.on(RoomEvent.ConnectionStateChanged, state => {
      if (state === ConnectionState.Disconnected && statusRef.current !== 'idle') cleanup()
    })

    await room.connect(auth.url, auth.token, { autoSubscribe: true })
    await room.localParticipant.setMicrophoneEnabled(true)
    if (video) await room.localParticipant.setCameraEnabled(true)
    syncLocalStream(room.localParticipant)
    syncPeers(room)
    setStatus('connected')
    setDuration(0)
    durationTimer.current = setInterval(() => setDuration(v => v + 1), 1000)
  }, [applyMute, cleanup, sendCommand, syncPeers])

  const startGroupCall = useCallback(async (gid: string, video: boolean, gname?: string) => {
    if (statusRef.current !== 'idle') return
    const cid = `gc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setCallId(cid); setGroupId(gid); setIsVideo(video); setGroupName(gname || ''); setStatus('connecting')
    try {
      await connectMeeting(gid, cid, video)
      sendWs({ type: 'group_call_invite', group_id: gid, call_id: cid, is_video: video })
    } catch (e) {
      cleanup()
      setError(e instanceof Error ? e.message : t('meeting.connection_failed'))
    }
  }, [cleanup, connectMeeting, t])

  const acceptGroupCall = useCallback(async () => {
    if (!groupIdRef.current || !callIdRef.current) return
    stopRingtone(); setStatus('connecting')
    try {
      await connectMeeting(groupIdRef.current, callIdRef.current, videoRef.current)
      sendWs({ type: 'group_call_join', group_id: groupIdRef.current, call_id: callIdRef.current })
    } catch (e) {
      cleanup()
      setError(e instanceof Error ? e.message : t('meeting.connection_failed'))
    }
  }, [cleanup, connectMeeting, t])

  const leaveGroupCall = useCallback(() => {
    if (groupIdRef.current && callIdRef.current) sendWs({ type: 'group_call_leave', group_id: groupIdRef.current, call_id: callIdRef.current })
    cleanup()
  }, [cleanup])

  const toggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const enable = isMuted
    if (enable && meetingMode === 'lecture' && !isHost) return
    await room.localParticipant.setMicrophoneEnabled(enable)
    setIsMuted(!enable); syncLocalStream(room.localParticipant)
  }, [isHost, isMuted, meetingMode])

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    await room.localParticipant.setCameraEnabled(isCameraOff)
    setIsCameraOff(!isCameraOff); syncLocalStream(room.localParticipant)
  }, [isCameraOff])

  const muteAll = useCallback(async () => { await applyMute(); await sendCommand({ kind: 'mute-all' }) }, [applyMute, sendCommand])
  const setMode = useCallback(async (mode: MeetingMode) => {
    if (!hostRef.current) return
    setMeetingMode(mode); modeRef.current = mode
    if (mode === 'lecture') await muteAll()
    await sendCommand({ kind: 'mode', mode })
  }, [muteAll, sendCommand])

  useEffect(() => {
    const off = onWs('group_call_invite', data => {
      if (data.from === userId || statusRef.current !== 'idle') return
      setCallId(data.call_id); setGroupId(data.group_id); setIsVideo(!!data.is_video)
      setInviterName(data.from_nickname || data.from || ''); setInviterAvatar(data.from_avatar || '')
      setGroupName(data.group_name || ''); setStatus('ringing'); playCallRingtone()
      showBrowserNotification('PaperPhonePlus', t(data.is_video ? 'meeting.video_title' : 'meeting.voice_title'), () => window.focus())
    })
    return off
  }, [t, userId])

  useEffect(() => () => cleanup(), [cleanup])

  return { status, callId, groupId, isVideo, isMuted, isCameraOff, duration, peers, localStream,
    inviterName, inviterAvatar, groupName, isHost, meetingMode, error, maxParticipants: 100,
    startGroupCall, acceptGroupCall, rejectGroupCall: cleanup, leaveGroupCall, toggleMute,
    toggleCamera, muteAll, setMeetingMode: setMode, cleanup,
  }
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60
  return [h, m, s].filter((_, i) => h > 0 || i > 0).map(v => String(v).padStart(2, '0')).join(':')
}
