import { useEffect, useState } from 'react'
import TgsPlayer from './TgsPlayer'
import { cachedStickerObjectUrl } from '../utils/stickerCache'

interface StickerMediaProps {
  fileId?: string
  fallbackUrl?: string
  type?: string
  width: number
  height: number
  alt?: string
  hoverPlay?: boolean
}

export default function StickerMedia({
  fileId,
  fallbackUrl,
  type = 'static',
  width,
  height,
  alt = 'sticker',
  hoverPlay = false,
}: StickerMediaProps) {
  const [src, setSrc] = useState(fileId ? '' : (fallbackUrl || ''))

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setSrc(fileId ? '' : (fallbackUrl || ''))

    if (fileId) {
      cachedStickerObjectUrl(fileId).then(url => {
        objectUrl = url
        if (!cancelled) setSrc(url)
      }).catch(() => {
        if (!cancelled) setSrc(fallbackUrl || '')
      })
    }

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId, fallbackUrl])

  if (!src) {
    return <span style={{ display: 'block', width, height }} aria-label={alt} />
  }
  if (type === 'animated') {
    return <TgsPlayer src={src} width={width} height={height} alt={alt} hoverPlay={hoverPlay} />
  }
  if (type === 'video') {
    return (
      <video src={src} autoPlay loop muted playsInline
        aria-label={alt}
        style={{ maxWidth: width, maxHeight: height, display: 'block', objectFit: 'contain', background: 'transparent' }} />
    )
  }
  return (
    <img src={src} alt={alt} loading="lazy"
      style={{ maxWidth: width, maxHeight: height, display: 'block', objectFit: 'contain', background: 'transparent' }} />
  )
}
