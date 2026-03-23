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

  const getButtonClass = (user) => {
    const baseClass = 'px-3 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 hover:shadow-md'
    
    if (user.friendStatus === 'accepted') 
      return `${baseClass} bg-green-50 text-green-700 hover:bg-green-100 border border-green-200`
    if (user.friendStatus === 'pending') 
      return `${baseClass} bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200`
    return `${baseClass} bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200`
  }

  return (
    <div className="border-b border-slate-200 pb-3 mb-3">
      {/* Search Input */}
      <div className="relative flex items-center gap-2">
        <span className="text-lg text-slate-400">🔍</span>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2.5 text-sm md:text-base border border-slate-300 bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400"
        />
        {searching && (
          <span className="text-xs text-slate-500 animate-pulse">Searching...</span>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-4 space-y-2 max-h-56 md:max-h-64 overflow-auto">
          {searchResults.map(user => (
            <div
              key={user._id}
              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {user.profilePhoto ? (
                  <img
                    src={getPhotoUrl(user.profilePhoto)}
                    alt={user.username || user.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">
                    {getInitials(user.username || user.name)}
                  </div>
                )}
                
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm truncate">
                    {user.name || user.username}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSendRequest(user._id)}
                disabled={loading || user.friendStatus === 'accepted'}
                className={`${getButtonClass(user)} flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {getButtonText(user)}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {searchQuery && !searching && searchResults.length === 0 && (
        <div className="mt-4 p-4 text-center">
          <p className="text-sm text-slate-500">No users found for "{searchQuery}"</p>
          <p className="text-xs text-slate-400 mt-1">Try a different search</p>
        </div>
      )}

      {/* Initial State */}
      {!searchQuery && (
        <div className="mt-2 text-xs text-slate-500 text-center py-2">
          Start typing to search for users
        </div>
      )}
    </div>
  )
}
