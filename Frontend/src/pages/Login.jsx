import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try{
      await login(email, password)
      nav('/')
    }catch(err){
      const errorMsg = err?.response?.data?.message || err?.message || 'Login failed'
      setError(errorMsg)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-3 py-4 md:px-6 md:py-8 overflow-auto">
      <div className="w-full max-w-md section-card p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-[#113730]">Welcome Back</h2>
            <p className="mt-2 text-sm text-[#5b7a72]">Sign in to continue your secure file exchange</p>
          </div>
          
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-sm font-medium text-[#40635b] mb-2">Email</label>
              <input 
                className="ui-input" 
                placeholder="Enter your email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#40635b] mb-2">Password</label>
              <input 
                className="ui-input" 
                placeholder="Enter your password" 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
              />
            </div>

            <button
              className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={!email || !password}
            >
              Login
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-[#ffeced] text-[#a03442] rounded-xl text-sm border border-[#f2c8ce]">
              {error}
            </div>
          )}

          <p className="mt-6 text-center text-[#5b7a72] text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#0b8b79] hover:text-[#0a7365] font-semibold">
              Register here
            </Link>
          </p>
      </div>
    </div>
  )
}

