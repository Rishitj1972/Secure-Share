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
      storePrivateKey(response.user?.id || response.user?._id || response.id || response._id, privateKey)
      
      setError('Registration successful! Redirecting...')
      setTimeout(() => nav('/login'), 1000)
    }catch(err){
      setError(err?.response?.data?.message || err?.message || 'Registration failed')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-3 py-4 md:px-6 md:py-8 overflow-auto">
      <div className="w-full max-w-md section-card p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-[#113730]">Create Account</h2>
            <p className="mt-2 text-sm text-[#5b7a72]">Set up your private encrypted workspace</p>
          </div>
          
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-sm font-medium text-[#40635b] mb-2">Full Name</label>
              <input 
                className="ui-input"
                placeholder="Enter your name" 
                value={name} 
                onChange={e=>setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#40635b] mb-2">Email</label>
              <input 
                className="ui-input"
                placeholder="Enter your email" 
                value={email} 
                onChange={e=>setEmail(e.target.value)}
                required
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
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#40635b] mb-2">Profile Photo (Optional)</label>
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
                  <span className="w-full block px-4 py-2.5 bg-[#eef7f3] text-[#315e56] border border-[#cde0d7] rounded-xl hover:bg-[#e1f2eb] text-center cursor-pointer">
                    Choose Photo
                  </span>
                </label>
                {profilePreview && (
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#7ac4b7]"
                  />
                )}
              </div>
            </div>

            <button 
              className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={!name || !email || !password || loading}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          {error && (
            <div className={`mt-4 p-3 rounded-xl text-sm border ${
              error.includes('successful') ? 'bg-[#e5f8ef] text-[#196e4a] border-[#bcead2]' : 
              error.includes('Generating') || error.includes('Creating') ? 'bg-[#e6f6f2] text-[#0c6f63] border-[#bde7dd]' : 
              'bg-[#ffeced] text-[#a03442] border-[#f2c8ce]'
            }`}>
              {error}
            </div>
          )}

          <p className="mt-6 text-center text-[#5b7a72] text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0b8b79] hover:text-[#0a7365] font-semibold">
              Login here
            </Link>
          </p>
      </div>
    </div>
  )
}
