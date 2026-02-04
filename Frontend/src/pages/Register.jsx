import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { generateRSAKeyPair, storePrivateKey } from '../utils/crypto'

export default function Register(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try{
      // Generate RSA key pair
      setError('Generating encryption keys...')
      const { publicKey, privateKey } = await generateRSAKeyPair()
      
      // Register user with public key
      setError('Creating account...')
      const formData = new FormData()
      formData.append('username', name)
      formData.append('email', email)
      formData.append('password', password)
      formData.append('rsaPublicKey', publicKey)
      if (profilePhoto) {
        formData.append('profilePhoto', profilePhoto)
      }

      const response = await register(formData)
      
      // Store private key locally
      storePrivateKey(response.user?.id || response.id, privateKey)
      
      setError('Registration successful! Redirecting...')
      setTimeout(() => nav('/login'), 1000)
    }catch(err){
      setError(err?.response?.data?.message || err?.message || 'Registration failed')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Create Account</h2>
          
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Enter your name" 
                value={name} 
                onChange={e=>setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Enter your email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)}
                required
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
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo (Optional)</label>
              <div className="flex flex-col items-center gap-3">
                <label className="cursor-pointer w-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setProfilePhoto(file)
                      setProfilePreview(file ? URL.createObjectURL(file) : '')
                    }}
                    className="hidden"
                  />
                  <span className="w-full block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center cursor-pointer">
                    📸 Choose Photo
                  </span>
                </label>
                {profilePreview && (
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-blue-300"
                  />
                )}
              </div>
            </div>

            <button 
              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50" 
              type="submit"
              disabled={!name || !email || !password || loading}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          {error && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              error.includes('successful') ? 'bg-green-100 text-green-800' : 
              error.includes('Generating') || error.includes('Creating') ? 'bg-blue-100 text-blue-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {error}
            </div>
          )}

          <p className="mt-6 text-center text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
