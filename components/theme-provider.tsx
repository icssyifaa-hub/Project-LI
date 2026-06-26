'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: 'class'
  defaultTheme?: Theme
  enableSystem?: boolean
  storageKey?: string
}

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
})

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  enableSystem = true,
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>('light')

  const resolvedTheme = theme === 'system' && enableSystem ? systemTheme : theme === 'dark' ? 'dark' : 'light'

  React.useEffect(() => {
    setThemeState((localStorage.getItem(storageKey) as Theme | null) || defaultTheme)
    setSystemTheme(getSystemTheme())
  }, [defaultTheme, storageKey])

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  React.useEffect(() => {
    if (!enableSystem) return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(media.matches ? 'dark' : 'light')

    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [enableSystem])

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setThemeState((event.newValue as Theme | null) || defaultTheme)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [defaultTheme, storageKey])

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme)
      localStorage.setItem(storageKey, nextTheme)
    },
    [storageKey]
  )

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => React.useContext(ThemeContext)
