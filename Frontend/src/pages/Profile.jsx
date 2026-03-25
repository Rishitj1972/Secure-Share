import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const uploadsBase = baseURL.replace(/\/api\/?$/, '')

function getPhotoUrl(photo) {
  if (!photo) return ''
  if (photo.startsWith('http')) return photo
  return `${uploadsBase}${photo}`
}

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean)
  const first = parts[0]?.[0] || ''
  const second = parts[1]?.[0] || ''
  return (first + second).toUpperCase() || '?'
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize preview with current user's profile photo
  useEffect(() => {
    if (user?.profilePhoto) {
      setProfilePreview(getPhotoUrl(user.profilePhoto))
    }
  }, [user?.profilePhoto])

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null
    setProfilePhoto(file)
    if (file) {
      setProfilePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('email', email)
      if (profilePhoto) {
        formData.append('profilePhoto', profilePhoto)
      }

      const response = await api.put('/users/profile/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess('Profile updated successfully!')
      
      // Update user in localStorage
      const updatedUser = {
        ...user,
        username: response.data.user.username,
        email: response.data.user.email,
        profilePhoto: response.data.user.profilePhoto
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      // Redirect to home after 2 seconds
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-3 py-4 md:px-6 md:py-8 overflow-auto">
      <div className="w-full max-w-md section-card p-6 md:p-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-[#113730]">Edit Profile</h2>

          {error && (
            <div className="mb-4 p-3 bg-[#ffeced] text-[#a03442] rounded-xl text-sm border border-[#f2c8ce]">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-[#e5f8ef] text-[#196e4a] rounded-xl text-sm border border-[#bcead2]">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profile Photo Section */}
            <div className="flex flex-col items-center gap-4">
              {profilePreview ? (
                <img
                  src={profilePreview}
                  alt="Profile preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-[#8ad0c4]"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#e9f2ee] flex items-center justify-center text-3xl font-semibold text-[#56756d] border-4 border-[#cde0d7]">
                  {getInitials(username || user?.username)}
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-[#e7f7f3] border border-[#cde0d7] text-[#2f5b54] rounded-xl hover:bg-[#dff2ec] inline-block cursor-pointer font-medium">
                  Change Photo
                </span>
              </label>
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ui-input"
                placeholder="Enter username"
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ui-input"
                placeholder="Enter email"
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="ui-btn ui-btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="ui-btn ui-btn-secondary flex-1 py-3"
              >
                Cancel
              </button>
            </div>
          </form>
      </div>
    </div>
  )
}
