/**
 * WebRTC 1:1 Call Hook
 *
 * Handles voice/video calls between two users:
 *   1. Fetch TURN credentials from server
 *   2. Create RTCPeerConnection
 *   3. Exchange offer/answer/ICE candidates via WebSocket signaling
 *   4. Manage local/remote media streams
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { sendWs, onWs } from '../api/socket'
import { get } from '../api/http'
import { playCallRingtone, stopRingtone, showBrowserNotification } from '../utils/notification'

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected' | 'error'
export type VoiceMode = 'normal' | 'slow' | 'fast'

const VOICE_RATES: Record<VoiceMode, number> = { slow: 0.8, normal: 1.0, fast: 1.2 }

interface CallInfo {
  peerId: string
  isVideo: boolean
  sdp?: string
  sdp_type?: RTCSdpType
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

export function useCall(userId: string | undefined) {
  const [callState, setCallState] = useState<CallState>('idle')
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callError, setCallError] = useState<string>('')
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('normal')

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoElementRef = useRef<HTMLVideoElement | null>(null)
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([])
  const callStateRef = useRef<CallState>('idle')
  const audioCtxRef = useRef<AudioContext | null>(null)
  const voiceModeRef = useRef<VoiceMode>('normal')
  callStateRef.current = callState
  voiceModeRef.current = voiceMode

  // ── Fetch & normalize TURN credentials ──
  const getIceServers = async (): Promise<RTCIceServer[]> => {
    try {
      const res = await get<{ iceServers: any }>('/api/calls/turn-credentials')
      const raw = res.iceServers
      if (Array.isArray(raw) && raw.length > 0) {
        const servers = raw.map((s: any) => ({
          urls: s.urls || s.url || '',
          ...(s.username ? { username: s.username } : {}),
          ...(s.credential ? { credential: s.credential } : {}),
        })).filter((s: any) => s.urls)
        if (servers.length > 0) {
          console.log('[Call] Using TURN/STUN servers:', servers.length)
          return servers
        }
      }
      console.warn('[Call] Using default STUN servers')
      return DEFAULT_ICE_SERVERS
    } catch (err) {
      console.warn('[Call] TURN fetch failed, using defaults:', err)
      return DEFAULT_ICE_SERVERS
    }
  }

  // ── Create peer connection ──
  const createPeerConnection = async (peerId: string, isVideo: boolean) => {
    const iceServers = await getIceServers()

    const pc = new RTCPeerConnection({ iceServers })
    pcRef.current = pc

    // Remote stream
    const remoteStream = new MediaStream()
    remoteStreamRef.current = remoteStream

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach(track => {
        remoteStream.addTrack(track)
      })
      if (remoteVideoElementRef.current) {
        remoteVideoElementRef.current.srcObject = remoteStream
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendWs({
          type: 'ice_candidate',
          to: peerId,
          candidate: e.candidate.toJSON(),
        })
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[Call] Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') {
        setCallState('connected')
        startDurationTimer()
      } else if (pc.connectionState === 'failed') {
        setCallError('Connection failed')
        setCallState('error')
        // Auto-close after 3 seconds
        setTimeout(() => cleanup(), 3000)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[Call] ICE state:', pc.iceConnectionState)
    }

    return pc
  }

  // ── Get local media ──
  const getLocalMedia = async (pc: RTCPeerConnection, isVideo: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
      })
      localStreamRef.current = stream
      if (localVideoElementRef.current) {
        localVideoElementRef.current.srcObject = stream
      }
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Apply voice effect processing chain
      const processedStream = applyVoiceEffect(stream)
      const senders = pc.getSenders()
      processedStream.getAudioTracks().forEach(newTrack => {
        const audioSender = senders.find(s => s.track?.kind === 'audio')
        if (audioSender) {
          audioSender.replaceTrack(newTrack).catch(() => {})
        }
      })

      return true
    } catch (err: any) {
      console.error('[Call] getUserMedia failed:', err)
      if (err?.name === 'NotAllowedError') {
        setCallError('Microphone/camera access denied')
      } else if (err?.name === 'NotFoundError') {
        setCallError('No microphone/camera found')
      } else {
        setCallError('Failed to access media devices')
      }
      return false
    }
  }

  // ── Voice changer: process local audio through AudioContext ──
  const applyVoiceEffect = (stream: MediaStream): MediaStream => {
    try {
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const destination = audioCtx.createMediaStreamDestination()

      // Use a BiquadFilter to shift pitch characteristics
      // Combined with a playback rate ScriptProcessor for real-time pitch shifting
      const bufferSize = 4096
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1)
      let inputBuffer: Float32Array[] = []
      let outputPhase = 0

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        const output = e.outputBuffer.getChannelData(0)
        const rate = VOICE_RATES[voiceModeRef.current]

        // Simple resampling for pitch shift
        for (let i = 0; i < output.length; i++) {
          const readIndex = outputPhase
          const intIndex = Math.floor(readIndex)
          const frac = readIndex - intIndex

          // Linear interpolation from input buffer
          if (intIndex < input.length - 1) {
            output[i] = input[intIndex] * (1 - frac) + input[intIndex + 1] * frac
          } else if (intIndex < input.length) {
            output[i] = input[intIndex]
          } else {
            output[i] = 0
          }
          outputPhase += rate
        }
        // Reset phase relative to processed samples
        outputPhase = outputPhase % input.length
      }

      source.connect(processor)
      processor.connect(destination)

      // Merge: replace audio tracks with processed audio, keep video tracks
      const processedStream = new MediaStream()
      destination.stream.getAudioTracks().forEach(t => processedStream.addTrack(t))
      stream.getVideoTracks().forEach(t => processedStream.addTrack(t))

      return processedStream
    } catch (err) {
      console.warn('[Call] Voice effect failed, using original stream:', err)
      return stream
    }
  }

  // ── Internal cleanup ──
  const cleanup = useCallback(() => {
    // Stop ringtone
    stopRingtone()

    pcRef.current?.close()
    pcRef.current = null

    // Close AudioContext for voice effect
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }

    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    remoteStreamRef.current = null

    if (localVideoElementRef.current) localVideoElementRef.current.srcObject = null
    if (remoteVideoElementRef.current) remoteVideoElementRef.current.srcObject = null

    if (durationTimer.current) clearInterval(durationTimer.current)
    durationTimer.current = null

    iceCandidateQueue.current = []
    setCallState('idle')
    setCallInfo(null)
    setCallDuration(0)
    setIsMuted(false)
    setIsCameraOff(false)
    setCallError('')
    setVoiceMode('normal')
  }, [])

  // ── Start outgoing call ──
  const startCall = useCallback(async (peerId: string, isVideo: boolean) => {
    if (callStateRef.current !== 'idle') return

    setCallState('outgoing')
    setCallInfo({ peerId, isVideo })
    setCallDuration(0)
    setCallError('')

    try {
      const pc = await createPeerConnection(peerId, isVideo)

      const mediaOk = await getLocalMedia(pc, isVideo)
      if (!mediaOk) {
        setCallState('error')
        // Keep error overlay visible for 3 seconds
        setTimeout(() => cleanup(), 3000)
        return
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      sendWs({
        type: 'call_offer',
        to: peerId,
        is_video: isVideo,
        sdp: offer.sdp,
        sdp_type: offer.type,
      })
    } catch (err) {
      console.error('[Call] startCall failed:', err)
      setCallError('Call failed: ' + (err as Error).message)
      setCallState('error')
      setTimeout(() => cleanup(), 3000)
    }
  }, [cleanup])

  // ── Accept incoming call ──
  const acceptCall = useCallback(async () => {
    if (callStateRef.current !== 'incoming' || !callInfo) return

    // Stop ringtone when accepting
    stopRingtone()

    setCallState('connecting')

    try {
      const pc = await createPeerConnection(callInfo.peerId, callInfo.isVideo)

      const mediaOk = await getLocalMedia(pc, callInfo.isVideo)
      if (!mediaOk) {
        sendWs({ type: 'call_reject', to: callInfo.peerId })
        setCallState('error')
        setTimeout(() => cleanup(), 3000)
        return
      }

      if (callInfo.sdp && callInfo.sdp_type) {
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: callInfo.sdp_type,
          sdp: callInfo.sdp,
        }))
      }

      for (const candidate of iceCandidateQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      }
      iceCandidateQueue.current = []

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      sendWs({
        type: 'call_answer',
        to: callInfo.peerId,
        sdp: answer.sdp,
        sdp_type: answer.type,
      })
    } catch (err) {
      console.error('[Call] acceptCall failed:', err)
      setCallError('Call failed: ' + (err as Error).message)
      setCallState('error')
      setTimeout(() => cleanup(), 3000)
    }
  }, [callInfo, cleanup])

  // ── Reject / Cancel / Hang up ──
  const rejectCall = useCallback(() => {
    if (callInfo) sendWs({ type: 'call_reject', to: callInfo.peerId })
    cleanup()
  }, [callInfo, cleanup])

  const cancelCall = useCallback(() => {
    if (callInfo) sendWs({ type: 'call_cancel', to: callInfo.peerId })
    cleanup()
  }, [callInfo, cleanup])

  const hangUp = useCallback(() => {
    if (callInfo) sendWs({ type: 'call_end', to: callInfo.peerId })
    cleanup()
  }, [callInfo, cleanup])

  // ── Toggle mute / camera ──
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }, [])

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCameraOff(c => !c)
  }, [])

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode(m => {
      const modes: VoiceMode[] = ['normal', 'slow', 'fast']
      const idx = modes.indexOf(m)
      return modes[(idx + 1) % modes.length]
    })
  }, [])

  const startDurationTimer = () => {
    if (durationTimer.current) clearInterval(durationTimer.current)
    setCallDuration(0)
    durationTimer.current = setInterval(() => {
      setCallDuration(d => d + 1)
    }, 1000)
  }

  // ── WebSocket signaling listener ──
  useEffect(() => {
    const unsubOffer = onWs('call_offer', (data) => {
      if (data.from === userId) return

      // Skip group call offers (they have call_id) — handled by useGroupCall
      if (data.call_id) return

      if (callStateRef.current !== 'idle') {
        sendWs({ type: 'call_reject', to: data.from })
        return
      }

      setCallInfo({
        peerId: data.from,
        isVideo: data.is_video || false,
        sdp: data.sdp,
        sdp_type: data.sdp_type,
      })
      setCallState('incoming')

      // Play ringtone for incoming call
      playCallRingtone()

      // Show browser notification if tab is hidden
      const callType = data.is_video ? 'Video Call' : 'Voice Call'
      showBrowserNotification(
        'PaperPhonePlus',
        `Incoming ${callType}`,
        () => window.focus()
      )
    })

    const unsubAnswer = onWs('call_answer', async (data) => {
      // Skip group call answers
      if (data.call_id) return
      const pc = pcRef.current
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: data.sdp_type || 'answer',
          sdp: data.sdp,
        }))
        for (const candidate of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
        }
        iceCandidateQueue.current = []
        setCallState('connecting')
      } catch (err) {
        console.error('[Call] setRemoteDescription failed:', err)
      }
    })

    const unsubIce = onWs('ice_candidate', async (data) => {
      // Skip group call ICE candidates
      if (data.call_id) return
      const pc = pcRef.current
      if (data.candidate) {
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {})
        } else {
          iceCandidateQueue.current.push(data.candidate)
        }
      }
    })

    const unsubReject = onWs('call_reject', () => cleanup())
    const unsubCancel = onWs('call_cancel', () => cleanup())
    const unsubEnd = onWs('call_end', () => cleanup())

    return () => {
      unsubOffer()
      unsubAnswer()
      unsubIce()
      unsubReject()
      unsubCancel()
      unsubEnd()
    }
  }, [userId, cleanup])

  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  // The local preview is only rendered after the call connects, while the
  // camera stream is acquired earlier. Callback refs attach the existing
  // streams whenever either video element mounts or is recreated.
  const localVideoRef = useCallback((element: HTMLVideoElement | null) => {
    localVideoElementRef.current = element
    if (element) element.srcObject = localStreamRef.current
  }, [])

  const remoteVideoRef = useCallback((element: HTMLVideoElement | null) => {
    remoteVideoElementRef.current = element
    if (element) element.srcObject = remoteStreamRef.current
  }, [])

  return {
    callState,
    callInfo,
    callDuration,
    callError,
    isMuted,
    isCameraOff,
    voiceMode,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    hangUp,
    toggleMute,
    toggleCamera,
    toggleVoiceMode,
    cleanup,
  }
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
