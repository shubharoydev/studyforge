import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, setToken, clearToken, isAuthenticated as checkAuth } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!checkAuth()) { setLoading(false); return }
    api.auth.me()
      .then((data) => setUser(data.user))
      .catch(() => { clearToken(); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.auth.login({ email, password })
    setToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (name, email, password) => {
    const data = await api.auth.register({ name, email, password })
    setToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const updateUser = useCallback((u) => setUser(u), [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
