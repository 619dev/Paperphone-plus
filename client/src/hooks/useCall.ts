/**
 * One-to-one voice/video calls backed by the same LiveKit SFU as group meetings.
 * WebSocket messages only handle ringing and call lifecycle; LiveKit owns media,
 * ICE negotiation, reconnection, and track subscription.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConnectionState, LocalAudioTrack, Room, RoomEvent, Track,
  type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication,
} from 'livekit-client'
import { post } from '../api/http'
import { sendWs, onWs } from '../api/socket'
import { playCallRingtone, stopRingtone, showBrowserNotification } from '../utils/notification'

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected' | 'error'
export type VoiceMode = 'normal' | 'slow' | 'fast'

const VOICE_RATES: Record<VoiceMode, number> = { slow: 0.8, normal: 1.0, fast: 1.2 }

interface CallInfo {
  peerId: string
  isVideo: boolean
  callId: string
}

type DirectTokenResponse = { url: string; token: string; room: string }

export function useCall(userId: string | undefined) {
  const [callState, setCallState] = useState<CallState>('idle')
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callError, setCallError] = useState('')
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('normal')

  const roomRef = useRef<Room | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteVideoTrackRef = useRef<RemoteTrack | null>(null)
  const remoteAudioTrackRef = useRef<RemoteTrack | null>(null)
  const originalAudioTrackRef = useRef<MediaStreamTrack | null>(null)
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoElementRef = useRef<HTMLVideoElement | null>(null)
  const remoteAudioElementRef = useRef<HTMLAudioElement | null>(null)
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStateRef = useRef<CallState>('idle')
  const callInfoRef = useRef<CallInfo | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const voiceModeRef = useRef<VoiceMode>('normal')
  callStateRef.current = callState
  callInfoRef.current = callInfo
  voiceModeRef.current = voiceMode
  const getCallState = () => callStateRef.current

  const startDurationTimer = useCallback(() => {
    // LiveKit can report ParticipantConnected, ConnectionState.Connected and
    // the signaling answer in different orders. Start exactly once so a later
    // event cannot reset or accidentally skip the timer.
    if (durationTimer.current) return
    setCallDuration(0)
    durationTimer.current = setInterval(() => setCallDuration(d => d + 1), 1000)
  }, [])

  const markConnected = useCallback(() => {
    callStateRef.current = 'connected'
    setCallState('connected')
    startDurationTimer()
  }, [startDurationTimer])

  const attachRemoteTracks = useCallback((room: Room) => {
    let videoTrack: RemoteTrack | null = null
    let audioTrack: RemoteTrack | null = null
    room.remoteParticipants.forEach(participant => {
      participant.trackPublications.forEach(publication => {
        const track = publication.track
        if (!track || publication.isMuted) return
        if (publication.kind === Track.Kind.Video && !videoTrack) videoTrack = track
        if (publication.kind === Track.Kind.Audio && !audioTrack) audioTrack = track
      })
    })
    // TypeScript does not carry assignments made inside the SDK collection
    // callbacks into its control-flow narrowing below.
    const selectedVideoTrack = videoTrack as RemoteTrack | null
    const selectedAudioTrack = audioTrack as RemoteTrack | null

    const videoElement = remoteVideoElementRef.current
    if (remoteVideoTrackRef.current !== selectedVideoTrack) {
      if (videoElement) remoteVideoTrackRef.current?.detach(videoElement)
      remoteVideoTrackRef.current = selectedVideoTrack
    }
    if (videoElement && selectedVideoTrack) {
      selectedVideoTrack.attach(videoElement)
      // Explicit play is needed by some iOS/WKWebView versions when srcObject
      // changes after the element has already mounted.
      videoElement.play().catch(err => console.warn('[Call] Remote video playback failed:', err))
    } else if (videoElement) {
      videoElement.srcObject = null
    }

    const audioElement = remoteAudioElementRef.current
    if (remoteAudioTrackRef.current !== selectedAudioTrack) {
      if (audioElement) remoteAudioTrackRef.current?.detach(audioElement)
      remoteAudioTrackRef.current = selectedAudioTrack
    }
    if (audioElement && selectedAudioTrack) {
      selectedAudioTrack.attach(audioElement)
      audioElement.play().catch(err => console.warn('[Call] Remote audio playback failed:', err))
    } else if (audioElement) {
      audioElement.srcObject = null
    }
  }, [])

  const cleanup = useCallback(() => {
    stopRingtone()
    if (durationTimer.current) clearInterval(durationTimer.current)
    durationTimer.current = null

    const room = roomRef.current
    roomRef.current = null
    if (room) room.disconnect()

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    localStreamRef.current?.getTracks().forEach(track => track.stop())
    originalAudioTrackRef.current?.stop()
    localStreamRef.current = null
    if (remoteVideoElementRef.current) remoteVideoTrackRef.current?.detach(remoteVideoElementRef.current)
    if (remoteAudioElementRef.current) remoteAudioTrackRef.current?.detach(remoteAudioElementRef.current)
    remoteVideoTrackRef.current = null
    remoteAudioTrackRef.current = null
    originalAudioTrackRef.current = null
    if (localVideoElementRef.current) localVideoElementRef.current.srcObject = null
    if (remoteVideoElementRef.current) remoteVideoElementRef.current.srcObject = null
    if (remoteAudioElementRef.current) remoteAudioElementRef.current.srcObject = null

    setCallState('idle')
    setCallInfo(null)
    callStateRef.current = 'idle'
    callInfoRef.current = null
    setCallDuration(0)
    setIsMuted(false)
    setIsCameraOff(false)
    setCallError('')
    setVoiceMode('normal')
  }, [])

  const failCall = useCallback((error: unknown) => {
    console.error('[Call] LiveKit call failed:', error)
    setCallError(error instanceof Error ? error.message : 'Connection failed')
    callStateRef.current = 'error'
    setCallState('error')
    setTimeout(() => cleanup(), 3000)
  }, [cleanup])

  const connectToCall = useCallback(async (info: CallInfo) => {
    const auth = await post<DirectTokenResponse>('/api/calls/direct-token', {
      peer_id: info.peerId,
      call_id: info.callId,
    })
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      disconnectOnPageLeave: true,
    })
    roomRef.current = room

    const refreshRemote = () => attachRemoteTracks(room)
    room.on(RoomEvent.TrackSubscribed, (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) => refreshRemote())
    room.on(RoomEvent.TrackUnsubscribed, refreshRemote)
    room.on(RoomEvent.TrackMuted, refreshRemote)
    room.on(RoomEvent.TrackUnmuted, refreshRemote)
    room.on(RoomEvent.ParticipantConnected, () => {
      refreshRemote()
      markConnected()
    })
    room.on(RoomEvent.ParticipantDisconnected, () => {
      refreshRemote()
      if (callStateRef.current === 'connected') cleanup()
    })
    room.on(RoomEvent.ConnectionStateChanged, state => {
      if (state === ConnectionState.Reconnecting) {
        callStateRef.current = 'connecting'
        setCallState('connecting')
      }
      if (state === ConnectionState.Connected && room.remoteParticipants.size > 0) {
        markConnected()
      }
      if (
        state === ConnectionState.Disconnected
        && roomRef.current === room
        && callStateRef.current !== 'idle'
      ) cleanup()
    })

    await room.connect(auth.url, auth.token, { autoSubscribe: true })
    await room.localParticipant.setMicrophoneEnabled(true)
    if (info.isVideo) await room.localParticipant.setCameraEnabled(true)

    const localTracks: MediaStreamTrack[] = []
    room.localParticipant.trackPublications.forEach(publication => {
      if (publication.track?.mediaStreamTrack) {
        localTracks.push(publication.track.mediaStreamTrack)
        if (publication.source === Track.Source.Microphone) {
          originalAudioTrackRef.current = publication.track.mediaStreamTrack
        }
      }
    })
    localStreamRef.current = new MediaStream(localTracks)
    if (localVideoElementRef.current) localVideoElementRef.current.srcObject = localStreamRef.current
    refreshRemote()
    return room
  }, [attachRemoteTracks, cleanup, markConnected])

  const startCall = useCallback(async (peerId: string, isVideo: boolean) => {
    if (callStateRef.current !== 'idle') return
    const info = {
      peerId,
      isVideo,
      callId: `dc_${Date.now()}_${crypto.randomUUID().replaceAll('-', '')}`,
    }
    callStateRef.current = 'outgoing'
    callInfoRef.current = info
    setCallState('outgoing')
    setCallInfo(info)
    setCallDuration(0)
    setCallError('')
    try {
      await connectToCall(info)
      if (callInfoRef.current?.callId !== info.callId || getCallState() === 'idle') {
        roomRef.current?.disconnect()
        roomRef.current = null
        return
      }
      sendWs({
        type: 'call_offer',
        to: peerId,
        call_id: info.callId,
        is_video: isVideo,
      })
    } catch (error) {
      failCall(error)
    }
  }, [connectToCall, failCall])

  const acceptCall = useCallback(async () => {
    const info = callInfoRef.current
    if (callStateRef.current !== 'incoming' || !info) return
    stopRingtone()
    callStateRef.current = 'connecting'
    setCallState('connecting')
    try {
      await connectToCall(info)
      if (callInfoRef.current?.callId !== info.callId || getCallState() === 'idle') {
        roomRef.current?.disconnect()
        roomRef.current = null
        return
      }
      sendWs({ type: 'call_answer', to: info.peerId, call_id: info.callId })
      if (roomRef.current?.remoteParticipants.size) markConnected()
    } catch (error) {
      sendWs({ type: 'call_reject', to: info.peerId, call_id: info.callId })
      failCall(error)
    }
  }, [connectToCall, failCall, markConnected])

  const rejectCall = useCallback(() => {
    const info = callInfoRef.current
    if (info) sendWs({ type: 'call_reject', to: info.peerId, call_id: info.callId })
    cleanup()
  }, [cleanup])

  const cancelCall = useCallback(() => {
    const info = callInfoRef.current
    if (info) sendWs({ type: 'call_cancel', to: info.peerId, call_id: info.callId })
    cleanup()
  }, [cleanup])

  const hangUp = useCallback(() => {
    const info = callInfoRef.current
    if (info) sendWs({ type: 'call_end', to: info.peerId, call_id: info.callId })
    cleanup()
  }, [cleanup])

  const toggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const enable = isMuted
    await room.localParticipant.setMicrophoneEnabled(enable)
    setIsMuted(!enable)
  }, [isMuted])

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    await room.localParticipant.setCameraEnabled(isCameraOff)
    setIsCameraOff(!isCameraOff)
  }, [isCameraOff])

  const createVoiceEffectTrack = useCallback((track: MediaStreamTrack): MediaStreamTrack | null => {
    try {
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
      const source = audioCtx.createMediaStreamSource(new MediaStream([track]))
      const destination = audioCtx.createMediaStreamDestination()
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      let outputPhase = 0
      processor.onaudioprocess = event => {
        const input = event.inputBuffer.getChannelData(0)
        const output = event.outputBuffer.getChannelData(0)
        const rate = VOICE_RATES[voiceModeRef.current]
        for (let i = 0; i < output.length; i++) {
          const index = Math.floor(outputPhase)
          const fraction = outputPhase - index
          output[i] = index < input.length - 1
            ? input[index] * (1 - fraction) + input[index + 1] * fraction
            : (input[index] || 0)
          outputPhase += rate
        }
        outputPhase %= input.length
      }
      source.connect(processor)
      processor.connect(destination)
      return destination.stream.getAudioTracks()[0] || null
    } catch (error) {
      console.warn('[Call] Voice effect failed:', error)
      return null
    }
  }, [])

  const toggleVoiceMode = useCallback(async () => {
    const room = roomRef.current
    const originalTrack = originalAudioTrackRef.current
    const publication = room?.localParticipant.getTrackPublication(Track.Source.Microphone)
    const localTrack = publication?.track
    if (!(localTrack instanceof LocalAudioTrack) || !originalTrack) return

    const modes: VoiceMode[] = ['normal', 'slow', 'fast']
    const nextMode = modes[(modes.indexOf(voiceModeRef.current) + 1) % modes.length]
    voiceModeRef.current = nextMode
    setVoiceMode(nextMode)

    if (nextMode === 'normal') {
      await localTrack.replaceTrack(originalTrack, true)
      if (audioCtxRef.current) {
        await audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      return
    }
    if (audioCtxRef.current) return
    const processedTrack = createVoiceEffectTrack(originalTrack)
    if (processedTrack) {
      await localTrack.replaceTrack(processedTrack, true)
    } else {
      voiceModeRef.current = 'normal'
      setVoiceMode('normal')
    }
  }, [createVoiceEffectTrack])

  useEffect(() => {
    const unsubOffer = onWs('call_offer', data => {
      if (data.from === userId || data.group_id || !data.call_id) return
      if (callStateRef.current !== 'idle') {
        sendWs({ type: 'call_reject', to: data.from, call_id: data.call_id })
        return
      }
      setCallInfo({
        peerId: data.from,
        isVideo: !!data.is_video,
        callId: data.call_id,
      })
      callInfoRef.current = {
        peerId: data.from,
        isVideo: !!data.is_video,
        callId: data.call_id,
      }
      callStateRef.current = 'incoming'
      setCallState('incoming')
      playCallRingtone()
      showBrowserNotification(
        'PaperPhonePlus',
        `Incoming ${data.is_video ? 'Video Call' : 'Voice Call'}`,
        () => window.focus(),
      )
    })
    const unsubAnswer = onWs('call_answer', data => {
      if (data.call_id !== callInfoRef.current?.callId) return
      if (roomRef.current?.remoteParticipants.size) {
        markConnected()
      } else if (!roomRef.current?.remoteParticipants.size) {
        callStateRef.current = 'connecting'
        setCallState('connecting')
      }
    })
    const finishMatchingCall = (data: any) => {
      if (!data.call_id || data.call_id === callInfoRef.current?.callId) cleanup()
    }
    const unsubReject = onWs('call_reject', finishMatchingCall)
    const unsubCancel = onWs('call_cancel', finishMatchingCall)
    const unsubEnd = onWs('call_end', finishMatchingCall)
    return () => {
      unsubOffer()
      unsubAnswer()
      unsubReject()
      unsubCancel()
      unsubEnd()
    }
  }, [cleanup, markConnected, userId])

  useEffect(() => () => cleanup(), [cleanup])

  const localVideoRef = useCallback((element: HTMLVideoElement | null) => {
    localVideoElementRef.current = element
    if (element) element.srcObject = localStreamRef.current
  }, [])
  const remoteVideoRef = useCallback((element: HTMLVideoElement | null) => {
    const previous = remoteVideoElementRef.current
    if (previous && previous !== element) remoteVideoTrackRef.current?.detach(previous)
    remoteVideoElementRef.current = element
    if (element && roomRef.current) attachRemoteTracks(roomRef.current)
  }, [attachRemoteTracks])
  const remoteAudioRef = useCallback((element: HTMLAudioElement | null) => {
    const previous = remoteAudioElementRef.current
    if (previous && previous !== element) remoteAudioTrackRef.current?.detach(previous)
    remoteAudioElementRef.current = element
    if (element && roomRef.current) attachRemoteTracks(roomRef.current)
  }, [attachRemoteTracks])

  return {
    callState, callInfo, callDuration, callError, isMuted, isCameraOff, voiceMode,
    localVideoRef, remoteVideoRef, remoteAudioRef, startCall, acceptCall, rejectCall,
    cancelCall, hangUp, toggleMute, toggleCamera, toggleVoiceMode, cleanup,
  }
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
