"use client"

import * as React from "react"

type Theme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "salintools-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    // On server, always return defaultTheme
    if (typeof window === "undefined") return defaultTheme
    
    // Check localStorage first
    try {
      const stored = localStorage.getItem(storageKey) as Theme
      if (stored === "dark" || stored === "light") {
        return stored
      }
    } catch (e) {
      // localStorage might not be available
    }
    
    return defaultTheme
  })

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    
    // Update DOM immediately
    const root = window.document.documentElement
    root.classList.remove("dark", "light")
    
    if (newTheme === "dark") {
      root.classList.add("dark")
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, newTheme)
    } catch (e) {
      // localStorage might not be available
    }
  }, [storageKey])

  // Sync with DOM on mount and when theme changes
  React.useEffect(() => {
    const root = window.document.documentElement
    
    // Remove any existing theme classes
    root.classList.remove("dark", "light")
    
    // Apply the current theme
    if (theme === "dark") {
      root.classList.add("dark")
    }
    
    // Ensure localStorage is in sync
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored !== theme) {
        localStorage.setItem(storageKey, theme)
      }
    } catch (e) {
      // localStorage might not be available
    }
  }, [theme, storageKey])

  const value = React.useMemo(() => ({
    theme,
    setTheme,
  }), [theme, setTheme])

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
