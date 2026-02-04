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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Login</h2>
          
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Enter your email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Enter your password" 
                type="password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
              />
            </div>

            <button 
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50" 
              type="submit"
              disabled={!email || !password}
            >
              Login
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          <p className="mt-6 text-center text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

