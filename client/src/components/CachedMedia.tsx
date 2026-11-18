import { forwardRef, useEffect, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { normalizeFileUrl } from '../api/http'
import { cachedMediaBlob } from '../utils/mediaCache'

function useMedia(src?: string) {
  const [resolved, setResolved] = useState<{ src: string; url: string }>()
  const [generation, setGeneration] = useState(0)
  useEffect(() => {
    const refresh = () => setGeneration(value => value + 1)
    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [])
  const remote = !!src && !/^(blob:|data:)/i.test(src)
  useEffect(() => {
    if (!src || !remote) return
    let active = true
    let objectUrl = ''
    const apply = (blob: Blob) => {
      if (!active) return
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = URL.createObjectURL(blob)
      setResolved({ src, url: objectUrl + (src.includes('#') ? '#' + src.split('#')[1] : '') })
    }
    const updated = (event: Event) => {
      const { url, blob } = (event as CustomEvent<{ url: string; blob: Blob }>).detail
      const target = new URL(normalizeFileUrl(src), location.href)
      target.hash = ''
      if (target.href === url) apply(blob)
    }
    window.addEventListener('pp-media-updated', updated)
    cachedMediaBlob(src).then(apply).catch(() => { if (active) setResolved({ src, url: src }) })
    return () => { active = false; window.removeEventListener('pp-media-updated', updated); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src, remote, generation])
  return remote ? (resolved?.src === src ? resolved.url : undefined) : src
}
export const CachedImage = forwardRef<HTMLImageElement, ComponentPropsWithoutRef<'img'>>((props, ref) => {
  const src = useMedia(props.src)
  return <img {...props} src={src} ref={ref} />
})
export const CachedVideo = forwardRef<HTMLVideoElement, ComponentPropsWithoutRef<'video'>>((props, ref) => {
  const src = useMedia(props.src)
  const poster = useMedia(props.poster)
  return <video {...props} src={src} poster={poster} ref={ref} />
})
export const CachedAudio = forwardRef<HTMLAudioElement, ComponentPropsWithoutRef<'audio'>>((props, ref) => {
  const src = useMedia(props.src)
  return <audio {...props} src={src} ref={ref} />
})
