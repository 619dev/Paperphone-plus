import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import lottie, { AnimationItem } from 'lottie-web'
import pako from 'pako'

interface TgsPlayerProps {
  /** URL to the .tgs file (can be a proxy URL) */
  src: string
  /** Width in px */
  width?: number
  /** Height in px */
  height?: number
  /** Loop playback (default true) */
  loop?: boolean
  /** Autoplay (default true) */
  autoplay?: boolean
  /** Play only on hover (default false) */
  hoverPlay?: boolean
  /** Alt text / title */
  alt?: string
  /** CSS class */
  className?: string
}

/**
 * TgsPlayer - Renders Telegram animated stickers (.tgs format).
 * TGS files are GZip-compressed Lottie JSON. We fetch the binary,
 * decompress with pako, and render with lottie-web.
 */
export default function TgsPlayer({
  src,
  width = 128,
  height = 128,
  loop = true,
  autoplay = true,
  hoverPlay = false,
  alt = 'sticker',
  className,
}: TgsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<AnimationItem | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src || !containerRef.current) return

    let cancelled = false

    const loadTgs = async () => {
      try {
        setLoading(true)
        setError(false)

        const resp = await fetch(src)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

        const buffer = await resp.arrayBuffer()

        // Decompress TGS (gzipped Lottie JSON)
        let jsonStr: string
        try {
          const decompressed = pako.inflate(new Uint8Array(buffer))
          jsonStr = new TextDecoder().decode(decompressed)
        } catch {
          // Maybe it's already plain JSON (fallback)
          jsonStr = new TextDecoder().decode(new Uint8Array(buffer))
        }

        const animationData = JSON.parse(jsonStr)

        if (cancelled || !containerRef.current) return

        // Clean up any previous animation
        if (animRef.current) {
          animRef.current.destroy()
          animRef.current = null
        }

        const anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay: hoverPlay ? false : autoplay,
          animationData,
        })

        animRef.current = anim
        setLoading(false)
      } catch (err) {
        console.warn('[TgsPlayer] Failed to load TGS:', err)
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    loadTgs()

    return () => {
      cancelled = true
      if (animRef.current) {
        animRef.current.destroy()
        animRef.current = null
      }
    }
  }, [src, loop, autoplay, hoverPlay])

  const handleMouseEnter = () => {
    if (hoverPlay && animRef.current) {
      animRef.current.play()
    }
  }

  const handleMouseLeave = () => {
    if (hoverPlay && animRef.current) {
      animRef.current.pause()
      animRef.current.goToAndStop(0, true)
    }
  }

  if (error) {
    return (
      <div
        style={{
          width, height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 11,
        }}
        title={alt}
      >
        <AlertTriangle size={16} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      title={alt}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: loading ? 0.3 : 1,
        transition: 'opacity .2s ease',
      }}
    />
  )
}
