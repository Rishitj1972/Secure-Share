import React, { createContext, useContext, useState } from 'react'
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

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const accessToken = res.data?.accessToken || res.data?.token
    if(!accessToken) throw new Error('Login response did not include access token')
    localStorage.setItem('token', accessToken)
    // Fetch current user using the protected endpoint
    const me = await api.post('/auth/current')
    const currentUser = me.data
    localStorage.setItem('user', JSON.stringify(currentUser))
    setUser(currentUser)
    return currentUser
  }

  const register = async (data) => {
    const res = await api.post('/auth/register', data)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const value = { user, login, register, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
