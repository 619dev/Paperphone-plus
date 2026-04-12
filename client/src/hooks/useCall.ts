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
import { post } from '../api/http'

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected'

interface CallInfo {
  peerId: string
  isVideo: boolean
}

export function useCall(userId: string | undefined) {
  const [callState, setCallState] = useState<CallState>('idle')
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([])

  // ── Fetch TURN credentials ──
  const getIceServers = async (): Promise<RTCIceServer[]> => {
    try {
      const res = await post<{ iceServers: RTCIceServer[] }>('/api/calls/turn-credentials')
      return res.iceServers || []
    } catch {
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
      ]
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
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach(track => {
        remoteStream.addTrack(track)
      })
    }

    // ICE candidates → send via signaling
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
      if (pc.connectionState === 'connected') {
        setCallState('connected')
        startDurationTimer()
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall()
      }
    }

    // Get local media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
    } catch (err) {
      console.error('[Call] getUserMedia failed:', err)
      throw err
    }

    return pc
  }

  // ── Start outgoing call ──
  const startCall = useCallback(async (peerId: string, isVideo: boolean) => {
    if (callState !== 'idle') return

    setCallState('outgoing')
    setCallInfo({ peerId, isVideo })
    setCallDuration(0)

    try {
      const pc = await createPeerConnection(peerId, isVideo)

      // Send call offer signal to peer
      sendWs({
        type: 'call_offer',
        to: peerId,
        is_video: isVideo,
      })

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
      endCall()
    }
  }, [callState])

  // ── Accept incoming call ──
  const acceptCall = useCallback(async () => {
    if (callState !== 'incoming' || !callInfo) return

    setCallState('connecting')

    try {
      const pc = await createPeerConnection(callInfo.peerId, callInfo.isVideo)

      // Process queued ICE candidates
      for (const candidate of iceCandidateQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      }
      iceCandidateQueue.current = []

      // Set remote description from stored offer
      const offerSdp = (callInfo as any).sdp
      const offerType = (callInfo as any).sdp_type
      if (offerSdp && offerType) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: offerType, sdp: offerSdp }))
      }

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
      endCall()
    }
  }, [callState, callInfo])

  // ── Reject / Cancel / End call ──
  const rejectCall = useCallback(() => {
    if (callInfo) {
      sendWs({ type: 'call_reject', to: callInfo.peerId })
    }
    endCall()
  }, [callInfo])

  const cancelCall = useCallback(() => {
    if (callInfo) {
      sendWs({ type: 'call_cancel', to: callInfo.peerId })
    }
    endCall()
  }, [callInfo])

  const hangUp = useCallback(() => {
    if (callInfo) {
      sendWs({ type: 'call_end', to: callInfo.peerId })
    }
    endCall()
  }, [callInfo])

  // ── Toggle mute / camera ──
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }, [])

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCameraOff(c => !c)
  }, [])

  // ── Cleanup ──
  const endCall = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null

    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    remoteStreamRef.current = null

    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null

    if (durationTimer.current) clearInterval(durationTimer.current)
    durationTimer.current = null

    iceCandidateQueue.current = []
    setCallState('idle')
    setCallInfo(null)
    setCallDuration(0)
    setIsMuted(false)
    setIsCameraOff(false)
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
    // Incoming call offer
    const unsubOffer = onWs('call_offer', async (data) => {
      if (data.from === userId) return // ignore self

      if (callState !== 'idle') {
        // Already in a call — auto-reject
        sendWs({ type: 'call_reject', to: data.from })
        return
      }

      // Store the offer for when user accepts
      setCallInfo({
        peerId: data.from,
        isVideo: data.is_video || false,
        sdp: data.sdp,
        sdp_type: data.sdp_type,
      } as any)
      setCallState('incoming')
    })

    // Call answer
    const unsubAnswer = onWs('call_answer', async (data) => {
      const pc = pcRef.current
      if (!pc) return

      try {
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: data.sdp_type || 'answer',
          sdp: data.sdp,
        }))
        setCallState('connecting')
      } catch (err) {
        console.error('[Call] setRemoteDescription failed:', err)
      }
    })

    // ICE candidate
    const unsubIce = onWs('ice_candidate', async (data) => {
      const pc = pcRef.current
      if (data.candidate) {
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {})
        } else {
          iceCandidateQueue.current.push(data.candidate)
        }
      }
    })

    // Call rejected
    const unsubReject = onWs('call_reject', () => {
      endCall()
    })

    // Call cancelled by caller
    const unsubCancel = onWs('call_cancel', () => {
      endCall()
    })

    // Call ended
    const unsubEnd = onWs('call_end', () => {
      endCall()
    })

    return () => {
      unsubOffer()
      unsubAnswer()
      unsubIce()
      unsubReject()
      unsubCancel()
      unsubEnd()
    }
  }, [userId, callState, endCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => { endCall() }
  }, [])

  return {
    callState,
    callInfo,
    callDuration,
    isMuted,
    isCameraOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    cancelCall,
    hangUp,
    toggleMute,
    toggleCamera,
  }
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
