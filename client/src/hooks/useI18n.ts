import { useCallback } from 'react'
import { useStore } from '../store'
import { t, LangCode, type TranslationParams } from '../i18n'

export function useI18n() {
  const lang = useStore(s => s.lang) as LangCode

  const tr = useCallback(
    (key: string, params?: TranslationParams) => t(key, lang, params),
    [lang]
  )

  return { t: tr, lang }
}
