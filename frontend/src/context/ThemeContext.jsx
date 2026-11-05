import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'befine-saas-ui-preferences-v3'
const LEGACY_STORAGE_KEYS = ['befine-saas-ui-preferences-v2', 'befine-saas-ui-preferences']
const DEFAULT_ACCENT = '#059669'

const ThemeContext = createContext(null)

let transitionTimer = null
function beginThemeTransition() {
  const root = document.documentElement
  root.classList.add('theme-transitioning')
  if (transitionTimer) window.clearTimeout(transitionTimer)
  transitionTimer = window.setTimeout(() => {
    root.classList.remove('theme-transitioning')
    transitionTimer = null
  }, 680)
}

function readStoredPreferences() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const stored = JSON.parse(raw)
      return {
        mode: stored.mode === 'dark' ? 'dark' : 'light',
        accentColor: /^#[0-9a-f]{6}$/i.test(stored.accentColor || '') ? stored.accentColor : DEFAULT_ACCENT,
      }
    } catch {
      // Bỏ qua dữ liệu giao diện cũ bị lỗi và thử key tiếp theo.
    }
  }
  return { mode: 'light', accentColor: DEFAULT_ACCENT }
}

function hexToRgb(hex) {
  const value = String(hex || DEFAULT_ACCENT).replace('#', '')
  const normalized = value.length === 3 ? value.split('').map(char => char + char).join('') : value
  const number = Number.parseInt(normalized, 16)
  if (Number.isNaN(number)) return '5, 150, 105'
  return `${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}`
}

function applyThemeToDocument(mode, accentColor) {
  const normalizedMode = mode === 'dark' ? 'dark' : 'light'
  const root = document.documentElement
  const body = document.body

  root.setAttribute('data-theme', normalizedMode)
  root.classList.toggle('theme-dark', normalizedMode === 'dark')
  root.classList.toggle('theme-light', normalizedMode === 'light')
  root.style.colorScheme = normalizedMode
  root.style.setProperty('--brand', accentColor)
  root.style.setProperty('--brand-rgb', hexToRgb(accentColor))
  root.style.setProperty('--emerald', accentColor)

  if (body) {
    body.setAttribute('data-theme', normalizedMode)
    body.classList.toggle('dark-mode', normalizedMode === 'dark')
    body.classList.toggle('light-mode', normalizedMode === 'light')
  }
}

export function ThemeProvider({ children }) {
  const initial = useMemo(readStoredPreferences, [])
  const [mode, setModeState] = useState(initial.mode)
  const [accentColor, setAccentColorState] = useState(initial.accentColor)

  const persist = useCallback((nextMode, nextAccent) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: nextMode, accentColor: nextAccent }))
    } catch {
      // Giao diện vẫn đổi trong phiên hiện tại nếu trình duyệt chặn localStorage.
    }
  }, [])

  const setMode = useCallback((nextMode) => {
    const normalized = nextMode === 'dark' ? 'dark' : 'light'
    if (normalized !== mode) beginThemeTransition()
    applyThemeToDocument(normalized, accentColor)
    setModeState(normalized)
    persist(normalized, accentColor)
  }, [accentColor, mode, persist])

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setMode])

  const setAccentColor = useCallback((nextAccent) => {
    beginThemeTransition()
    const normalized = /^#[0-9a-f]{6}$/i.test(nextAccent || '') ? nextAccent : DEFAULT_ACCENT
    applyThemeToDocument(mode, normalized)
    setAccentColorState(normalized)
    persist(mode, normalized)
  }, [mode, persist])

  useEffect(() => {
    applyThemeToDocument(mode, accentColor)
  }, [mode, accentColor])

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const next = JSON.parse(event.newValue)
        const nextMode = next.mode === 'dark' ? 'dark' : 'light'
        const nextAccent = /^#[0-9a-f]{6}$/i.test(next.accentColor || '') ? next.accentColor : DEFAULT_ACCENT
        setModeState(nextMode)
        setAccentColorState(nextAccent)
        applyThemeToDocument(nextMode, nextAccent)
      } catch {
        // Không làm gián đoạn ứng dụng nếu dữ liệu giữa các tab không hợp lệ.
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo(() => ({
    mode,
    isDark: mode === 'dark',
    accentColor,
    setMode,
    toggleMode,
    setAccentColor,
  }), [mode, accentColor, setMode, toggleMode, setAccentColor])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
