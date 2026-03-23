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
  const [step, setStep] = useState(1) // 1: details, 2: photo
  const { register } = useAuth()
  const nav = useNavigate()

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePhoto(file)
      setProfilePreview(URL.createObjectURL(file))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try{
      setError('Generating encryption keys...')
      const { publicKey, privateKey } = await generateRSAKeyPair()
      
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
      
      storePrivateKey(response.user?.id || response.user?._id || response.id || response._id, privateKey)
      
      setError('')
      console.log('Registration successful! Redirecting...')
      setTimeout(() => nav('/login'), 1000)
    }catch(err){
      setError(err?.response?.data?.message || err?.message || 'Registration failed')
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
            <div className="text-5xl mb-3 inline-block">✨</div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Create Account</h1>
            <p className="text-sm text-slate-600">Join our secure sharing community</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step === 1 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step === 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            
            {step === 1 ? (
              <>
                {/* Full Name Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2.5">Full Name</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400" 
                    placeholder="John Doe" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

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
                  <p className="text-xs text-slate-500 mt-2">Min 6 characters recommended</p>
                </div>

                {/* Next Button */}
                <button 
                  type="button"
                  onClick={() => {
                    if (name && email && password) setStep(2)
                    else setError('Please fill in all fields')
                  }}
                  className="w-full px-4 py-3 mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                >
                  Continue →
                </button>
              </>
            ) : (
              <>
                {/* Profile Photo Section */}
                <div className="text-center">
                  <label className="block text-sm font-semibold text-slate-800 mb-4">Profile Photo (Optional)</label>
                  <div className="flex flex-col items-center gap-4">
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 flex items-center justify-center text-4xl">
                        📸
                      </div>
                    )}
                    
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <span className="px-4 py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 inline-block cursor-pointer font-medium text-sm transition-colors">
                        {profilePreview ? '📷 Change Photo' : '📷 Add Photo'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Review Summary */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
                  <h3 className="font-semibold text-slate-900 text-sm mb-3">Account Details</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="text-slate-600">Name:</span> <span className="font-medium text-slate-900">{name}</span></p>
                    <p><span className="text-slate-600">Email:</span> <span className="font-medium text-slate-900">{email}</span></p>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    ← Back
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Creating...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </>
            )}
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

          {/* Sign In Link */}
          <p className="text-center text-slate-700 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
              Sign in here
            </Link>
          </p>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500 space-y-1">
            <p>🔒 Your files are encrypted end-to-end</p>
            <p>By registering, you agree to our Terms of Service</p>
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
