import { useSyncExternalStore, useCallback } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'kernel-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

// Shared singleton so all useTheme() consumers stay in sync
let currentTheme: Theme = getInitialTheme()
const listeners = new Set<() => void>()

function applyTheme(theme: Theme) {
  currentTheme = theme
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  localStorage.setItem(STORAGE_KEY, theme)
  listeners.forEach(fn => fn())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return currentTheme
}

function getServerSnapshot() {
  return 'dark' as Theme
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggleTheme = useCallback(() => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }, [])

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
