import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [token, setToken]     = useState(() => localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  // Verify token on first load
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return }
      try {
        const { data } = await api.get('/api/auth/me')
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      } catch {
        logout()
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, []) // eslint-disable-line

  const login = useCallback((tokenVal, userData) => {
    localStorage.setItem('token', tokenVal)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(tokenVal)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((updated) => {
    setUser(updated)
    localStorage.setItem('user', JSON.stringify(updated))
  }, [])

  const isAdmin     = user?.role === 'admin'
  const isModerator = user?.role === 'moderator'
  const isAdminOrMod = isAdmin || isModerator
  const isLoggedIn  = !!user && user.status === 'approved'

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout, updateUser,
      isAdmin, isModerator, isAdminOrMod, isLoggedIn,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
