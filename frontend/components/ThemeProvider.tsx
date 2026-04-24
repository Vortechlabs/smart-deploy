'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage ONCE
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    if (savedTheme) {
      setThemeState(savedTheme)
    }
    setMounted(true)
  }, [])

  // Apply theme IMMEDIATELY without waiting
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    let appliedTheme: 'light' | 'dark'

    if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      appliedTheme = isDark ? 'dark' : 'light'
    } else {
      appliedTheme = newTheme
    }

    // Apply class langsung
    if (appliedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    setResolvedTheme(appliedTheme)
    localStorage.setItem('theme', newTheme)
  }

  // Apply when theme state changes
  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted])

  // Listen to system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark')
        setResolvedTheme('dark')
      } else {
        document.documentElement.classList.remove('dark')
        setResolvedTheme('light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  const setTheme = async (newTheme: Theme) => {
    // 🔥 Apply IMMEDIATELY first (no flicker!)
    applyTheme(newTheme)
    setThemeState(newTheme)
    
    // 🔥 Save to backend SILENTLY (no UI impact)
    const token = localStorage.getItem('github_token')
    if (token) {
      fetch('http://41.216.191.42:3000/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme: newTheme })
      }).catch(err => console.error('Failed to save theme:', err))
    }
  }

  // 🔥 Prevent flash on initial load
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}