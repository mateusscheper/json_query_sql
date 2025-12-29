import { ref } from 'vue'

const isDarkMode = ref(false)

const getDeviceTheme = () => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

const loadTheme = () => {
  const saved = localStorage.getItem('theme')
  if (saved) {
    isDarkMode.value = saved === 'dark'
  } else {
    isDarkMode.value = getDeviceTheme()
    saveTheme()
  }
  applyTheme()
}

const saveTheme = () => {
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  saveTheme()
  applyTheme()
}

const applyTheme = () => {
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

export {
  isDarkMode,
  loadTheme,
  toggleTheme
}