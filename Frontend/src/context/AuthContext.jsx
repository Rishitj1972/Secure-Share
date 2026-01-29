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
    try {
      const res = await api.post('/auth/login', { email, password }, {withCredentials: true})
      const accessToken = res.data?.accessToken || res.data?.token
      if(!accessToken) throw new Error('Invalid login response: no access token')
      
      localStorage.setItem('token', accessToken)
      
      // Use user data from login response
      const currentUser = res.data?.user
      if(!currentUser) throw new Error('Invalid login response: no user data')
      
      localStorage.setItem('user', JSON.stringify(currentUser))
      setUser(currentUser)
      return currentUser
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
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
