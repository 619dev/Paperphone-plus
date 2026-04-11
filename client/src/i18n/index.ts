import { zh } from './locales/zh'
import { en } from './locales/en'
import { ja } from './locales/ja'
import { ko } from './locales/ko'
import { fr } from './locales/fr'
import { de } from './locales/de'
import { ru } from './locales/ru'
import { es } from './locales/es'

export type LangCode = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'ru' | 'es'

const messages: Record<LangCode, Record<string, string>> = {
  zh, en, ja, ko, fr, de, ru, es,
}

export const langNames: Record<LangCode, string> = {
  zh: '中文', en: 'English', ja: '日本語', ko: '한국어',
  fr: 'Français', de: 'Deutsch', ru: 'Русский', es: 'Español',
}

export const allLangs = Object.keys(langNames) as LangCode[]

export function t(key: string, lang: LangCode = 'zh'): string {
  return messages[lang]?.[key] || messages['en']?.[key] || key
}
