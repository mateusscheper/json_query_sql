import { ref, computed } from 'vue'
import enTranslations from '@/locales/en.json'
import ptTranslations from '@/locales/pt.json'
import esTranslations from '@/locales/es.json'

const translations = {
  en: enTranslations,
  pt: ptTranslations,
  es: esTranslations
}

const currentLanguage = ref('en')

const getDeviceLanguage = () => {
  const lang = navigator.language || navigator.userLanguage
  if (lang.startsWith('pt')) return 'pt'
  if (lang.startsWith('es')) return 'es'
  return 'en'
}

const loadLanguage = () => {
  const saved = localStorage.getItem('language')
  if (saved && translations[saved]) {
    currentLanguage.value = saved
  } else {
    currentLanguage.value = getDeviceLanguage()
    saveLanguage()
  }
}

const saveLanguage = () => {
  localStorage.setItem('language', currentLanguage.value)
}

const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLanguage.value = lang
    saveLanguage()
  }
}

const t = (key, params = {}) => {
  const keys = key.split('.')
  let value = translations[currentLanguage.value]
  
  for (const k of keys) {
    value = value?.[k]
  }
  
  if (!value) return key
  
  return Object.keys(params).reduce((str, param) => {
    return str.replace(new RegExp(`{{${param}}}`, 'g'), params[param])
  }, value)
}

const availableLanguages = computed(() => [
  { code: 'en', name: t('language.english'), flag: 'US' },
  { code: 'pt', name: t('language.portuguese'), flag: 'BR' },
  { code: 'es', name: t('language.spanish'), flag: 'ES' }
])

export {
  currentLanguage,
  loadLanguage,
  setLanguage,
  t,
  availableLanguages
}