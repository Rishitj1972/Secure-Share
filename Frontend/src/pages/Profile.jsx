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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">Edit Profile</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm">
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
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-300"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-semibold text-gray-600 border-4 border-gray-300">
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
                <span className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 inline-block cursor-pointer font-medium">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email"
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-semibold transition"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
