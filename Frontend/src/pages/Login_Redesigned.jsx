import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try{
      await login(email, password)
      nav('/')
    }catch(err){
      const errorMsg = err?.response?.data?.message || err?.message || 'Login failed'
      setError(errorMsg)
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-12 bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-white/20 backdrop-blur-sm">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3 inline-block">🔐</div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Welcome Back</h1>
            <p className="text-sm text-slate-600">End-to-End Encrypted File Sharing</p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={submit}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2.5">Email Address</label>
              <input 
                type="email"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400" 
                placeholder="you@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2.5">Password</label>
              <input 
                type="password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start gap-3">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Button */}
            <button 
              type="submit"
              disabled={!email || !password || loading}
              className="w-full px-4 py-3 mt-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-slate-700 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
              Create one now
            </Link>
          </p>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
            <p>🔒 Your files are encrypted end-to-end</p>
          </div>
        </div>

        {/* Bottom Info */}
        <p className="text-center text-white/70 text-xs mt-6">
          v5.0.0 • Secure Share Platform
        </p>
      </div>
    </div>
  )
}
