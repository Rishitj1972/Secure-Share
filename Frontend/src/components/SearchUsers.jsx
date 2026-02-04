import React, { useState, useEffect } from 'react'
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

export default function SearchUsers({ showNotification, onFriendAdded }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const delayTimer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setSearching(true)
        try {
          const res = await api.get(`/friends/search?q=${encodeURIComponent(searchQuery)}`)
          setSearchResults(res.data)
        } catch (err) {
          showNotification?.(err?.response?.data?.message || 'Search failed', 'error')
          setSearchResults([])
        } finally {
          setSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 500)

    return () => clearTimeout(delayTimer)
  }, [searchQuery])

  const handleSendRequest = async (userId) => {
    setLoading(true)
    try {
      await api.post('/friends/request', { receiverId: userId })
      showNotification?.('Friend request sent', 'success')
      setSearchResults(prev =>
        prev.map(u =>
          u._id === userId ? { ...u, friendStatus: 'pending' } : u
        )
      )
      onFriendAdded?.()
    } catch (err) {
      showNotification?.(err?.response?.data?.message || 'Failed to send request', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getButtonText = (user) => {
    if (user.friendStatus === 'accepted') return '👫 Friends'
    if (user.friendStatus === 'pending') return user.isRequester ? '⏳ Pending' : '🔔 Accept?'
    return '➕ Add Friend'
  }

  const getButtonStyle = (user) => {
    if (user.friendStatus === 'accepted') return 'bg-green-100 text-green-700 hover:bg-green-200'
    if (user.friendStatus === 'pending') return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
    return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
  }

  return (
    <div className="border-b pb-3 mb-3">
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searching && <span className="text-xs text-gray-500 absolute right-2 top-3">Searching...</span>}
      </div>

      {searchResults.length > 0 && (
        <div className="mt-3 space-y-2 max-h-64 overflow-auto">
          {searchResults.map(user => (
            <div
              key={user._id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {user.profilePhoto ? (
                  <img
                    src={getPhotoUrl(user.profilePhoto)}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover border flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                    {getInitials(user.username)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-800 truncate">{user.username}</div>
                  <div className="text-xs text-gray-500 truncate">{user.email}</div>
                </div>
              </div>
              <button
                onClick={() => handleSendRequest(user._id)}
                disabled={loading || user.friendStatus === 'accepted'}
                className={`text-xs px-2 py-1 rounded transition-colors ${getButtonStyle(user)} disabled:opacity-50 cursor-pointer whitespace-nowrap flex-shrink-0 ml-2`}
              >
                {getButtonText(user)}
              </button>
            </div>
          ))}
        </div>
      )}

      {searchQuery.trim().length > 0 && searchResults.length === 0 && !searching && (
        <div className="text-xs text-gray-500 mt-2 text-center py-2">No users found</div>
      )}
    </div>
  )
}
