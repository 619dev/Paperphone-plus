/**
 * Global Call Overlay
 *
 * Renders the call UI (incoming/outgoing/connected) as a fixed overlay
 * on top of the entire app. Imported at the App level.
 */
import { useCallContext, formatDuration } from '../contexts/CallContext'
import { useStore } from '../store'
import { useI18n } from '../hooks/useI18n'
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, CameraOff, Video as VideoIcon, AudioLines } from 'lucide-react'

export default function CallOverlay() {
  const call = useCallContext()
  const { t } = useI18n()
  const friends = useStore(s => s.friends)

  if (call.callState === 'idle') return null

  // Find peer info
  const peer = friends.find(f => f.id === call.callInfo?.peerId)
  const peerName = peer?.nickname || peer?.username || call.callInfo?.peerId || '?'
  const showCompactVideoInfo = !!call.callInfo?.isVideo
    && (call.callState === 'connected' || call.callState === 'connecting')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: call.callInfo?.isVideo ? '#000' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', animation: 'fade-in .3s ease',
    }}>
      {/* Always render a dedicated player for the remote audio track. Voice
          calls have no remote video element, and video is muted below to
          ensure audio is played exactly once. */}
      <audio ref={call.remoteAudioRef} autoPlay />

      {/* Remote video (full screen) */}
      {call.callInfo?.isVideo && (
        <video ref={call.remoteVideoRef} autoPlay playsInline muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {/* Local video (PIP) */}
      {call.callInfo?.isVideo && call.callState === 'connected' && (
        <video ref={call.localVideoRef} autoPlay playsInline muted
          style={{
            position: 'absolute', top: 60, right: 16, width: 120, height: 160,
            borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)',
            zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }} />
      )}

      {/* Call info */}
      <div style={{
        position: showCompactVideoInfo ? 'absolute' : 'relative',
        ...(showCompactVideoInfo ? {
          top: 'calc(var(--safe-top) + 12px)',
          left: 'calc(var(--safe-left) + 16px)',
          maxWidth: 'calc(100% - var(--safe-left) - var(--safe-right) - 180px)',
          padding: '8px 12px',
          borderRadius: 14,
          background: 'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          textShadow: '0 1px 3px rgba(0,0,0,0.55)',
        } : {}),
        zIndex: 5, display: 'flex', flexDirection: 'column',
        alignItems: showCompactVideoInfo ? 'flex-start' : 'center',
        gap: showCompactVideoInfo ? 2 : 12,
      }}>
        {/* Avatar */}
        {!showCompactVideoInfo && (
          <div style={{
            width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, fontWeight: 600, border: '3px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
          }}>
            {peer?.avatar
              ? <img src={peer.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : (peerName?.[0] || '?')}
          </div>
        )}

        <div style={{
          fontSize: showCompactVideoInfo ? 16 : 22,
          fontWeight: 600,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{peerName}</div>

        {/* Status */}
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          {call.callState === 'outgoing' && (t('call.outgoing') || 'Calling...')}
          {call.callState === 'incoming' && (t('call.incoming') || 'Incoming call')}
          {call.callState === 'connecting' && (t('call.connecting') || 'Connecting...')}
          {call.callState === 'connected' && formatDuration(call.callDuration)}
          {call.callState === 'error' && (
            <span style={{ color: '#ef4444' }}>{call.callError || 'Call failed'}</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 24, zIndex: 5,
      }}>
        {/* Incoming: Accept / Reject */}
        {call.callState === 'incoming' && (
          <>
            <button onClick={call.rejectCall}
              style={btnStyle('#ef4444')}>
              <PhoneOff size={28} />
            </button>
            <button onClick={call.acceptCall}
              style={btnStyle('#22c55e')}>
              <PhoneIncoming size={28} />
            </button>
          </>
        )}

        {/* Outgoing: Cancel */}
        {call.callState === 'outgoing' && (
          <button onClick={call.cancelCall} style={btnStyle('#ef4444')}>
            <PhoneOff size={28} />
          </button>
        )}

        {/* Connected: Mute / Camera / Hang up */}
        {(call.callState === 'connected' || call.callState === 'connecting') && (
          <>
            <button onClick={call.toggleMute}
              style={smallBtnStyle(call.isMuted)}>
              {call.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            {call.callInfo?.isVideo && (
              <button onClick={call.toggleCamera}
                style={smallBtnStyle(call.isCameraOff)}>
                {call.isCameraOff ? <CameraOff size={22} /> : <VideoIcon size={22} />}
              </button>
            )}
            <button onClick={call.toggleVoiceMode}
              style={voiceBtnStyle(call.voiceMode)}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {call.voiceMode === 'slow' ? '🐢' : call.voiceMode === 'fast' ? '🐇' : '🔊'}
              </span>
              <span style={{ fontSize: 10, marginTop: 1 }}>
                {call.voiceMode === 'slow' ? '0.8x' : call.voiceMode === 'fast' ? '1.2x' : t('call.voice_normal') || '1.0x'}
              </span>
            </button>
            <button onClick={call.hangUp} style={btnStyle('#ef4444')}>
              <PhoneOff size={28} />
            </button>
          </>
        )}

        {/* Error: Dismiss */}
        {call.callState === 'error' && (
          <button onClick={call.cleanup}
            style={btnStyle('rgba(255,255,255,0.2)')}>
            <PhoneOff size={28} />
          </button>
        )}
      </div>
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    width: 64, height: 64, borderRadius: '50%', border: 'none',
    background: bg, color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: bg.startsWith('rgba') ? 'none' : `0 4px 20px ${bg}66`,
  }
}

function smallBtnStyle(active: boolean): React.CSSProperties {
  return {
    width: 52, height: 52, borderRadius: '50%', border: 'none',
    background: active ? '#ef4444' : 'rgba(255,255,255,0.2)',
    color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  }
}

function voiceBtnStyle(mode: string): React.CSSProperties {
  const isActive = mode !== 'normal'
  return {
    width: 52, height: 52, borderRadius: '50%', border: 'none',
    background: isActive
      ? 'linear-gradient(135deg, #667eea, #764ba2)'
      : 'rgba(255,255,255,0.2)',
    color: '#fff', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease',
    boxShadow: isActive ? '0 2px 12px rgba(102,126,234,0.5)' : 'none',
  }
}
