import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext()

export function useAuth(){
  return useContext(AuthContext)
}

export function AuthProvider({ children }){
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  // Function to handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('logout_triggered')
    setUser(null)
  }, [])

  // Listen for logout triggered by axios interceptor or other tabs
  useEffect(() => {
    // Listen for logout event from axios interceptor
    window.addEventListener('logout', handleLogout)
    
    // Listen for storage changes from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'logout_triggered' || (e.key === 'token' && !e.newValue)) {
        handleLogout()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Check if logout was triggered on app load
    if (localStorage.getItem('logout_triggered')) {
      handleLogout()
    }

    return () => {
      window.removeEventListener('logout', handleLogout)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [handleLogout])

  // Token validation interval to detect if token is no longer valid
  // (e.g., when another device logs in with same credentials)
  useEffect(() => {
    if (!user?.id) return

    const validateToken = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          handleLogout()
          return
        }

        // Check if current token is still valid
        const res = await api.post('/auth/current')
        if (!res.data || res.data.id !== user.id) {
          // Token still valid but belongs to different user - logout
          handleLogout()
        }
      } catch (error) {
        if (error?.response?.status === 401) {
          // Token is no longer valid - another device logged in
          handleLogout()
        }
        // Ignore other errors as they might be temporary
      }
    }

    // Validate token every 10 seconds
    const intervalId = setInterval(validateToken, 10000)

    // Also validate on user interaction to catch logout faster
    const handleUserActivity = () => {
      validateToken()
    }

    window.addEventListener('click', handleUserActivity)
    window.addEventListener('keydown', handleUserActivity)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('click', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
    }
  }, [user?.id, handleLogout])

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password }, {withCredentials: true})
      const accessToken = res.data?.accessToken || res.data?.token
      if(!accessToken) throw new Error('Invalid login response: no access token')
      
      localStorage.setItem('token', accessToken)
      
      // Use user data from login response
      const currentUser = res.data?.user
      if(!currentUser) throw new Error('Invalid login response: no user data')
      
      localStorage.setItem('user', JSON.stringify(currentUser))
      localStorage.removeItem('logout_triggered')
      setUser(currentUser)
      return currentUser
    } catch (error) {
      throw error
    }
  }

  const register = async (data) => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
    const res = await api.post('/auth/register', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    })
    return res.data
  }

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      await api.post('/auth/logout')
    } catch (error) {
      // Even if logout fails, clear local storage
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('logout_triggered')
      setUser(null)
    }
  }

  const value = { user, login, register, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
