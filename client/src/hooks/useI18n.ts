import { useCallback } from 'react'
import { useStore } from '../store'
import { t, LangCode } from '../i18n'

export function useI18n() {
  const lang = useStore(s => s.lang) as LangCode

  const tr = useCallback(
    (key: string) => t(key, lang),
    [lang]
  )

  return { t: tr, lang }
}
