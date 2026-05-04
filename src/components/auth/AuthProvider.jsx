import { createContext, useContext, useMemo, useState } from 'react'
import {
  clearStoredSession,
  getStoredSession,
  loginWithCredentials,
  updateStoredUser,
} from '../../services/auth'
import { disconnectSocket } from '../../services/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession())
  const [authLoading, setAuthLoading] = useState(false)

  const login = async (credentials) => {
    setAuthLoading(true)
    try {
      const nextSession = await loginWithCredentials(credentials)
      setSession(nextSession)
      return nextSession
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
    clearStoredSession()
    disconnectSocket()
    setSession(null)
  }

  const updateProfile = (patch) => {
    const nextSession = updateStoredUser(patch)
    if (nextSession) setSession(nextSession)
    return nextSession
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      authLoading,
      login,
      logout,
      updateProfile,
    }),
    [session, authLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
