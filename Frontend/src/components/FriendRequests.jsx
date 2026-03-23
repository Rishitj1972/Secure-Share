import React, { useEffect, useState } from 'react'
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

export default function FriendRequests({ showNotification, onRefresh }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const res = await api.get('/friends/requests/pending')
      setRequests(res.data)
    } catch (err) {
      console.error('Failed to load requests:', err)
    }
  }

  const handleAccept = async (friendshipId) => {
    setLoading(true)
    try {
      await api.put(`/friends/request/${friendshipId}/accept`)
      showNotification?.('Friend request accepted', 'success')
      setRequests(prev => prev.filter(r => r._id !== friendshipId))
      onRefresh?.()
    } catch (err) {
      showNotification?.(err?.response?.data?.message || 'Failed to accept request', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (friendshipId) => {
    setLoading(true)
    try {
      await api.put(`/friends/request/${friendshipId}/reject`)
      showNotification?.('Friend request rejected', 'success')
      setRequests(prev => prev.filter(r => r._id !== friendshipId))
    } catch (err) {
      showNotification?.(err?.response?.data?.message || 'Failed to reject request', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (requests.length === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-3 mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left font-semibold text-blue-900 flex items-center justify-between text-sm md:text-base"
      >
        <span>🔔 Friend Requests ({requests.length})</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {requests.map(req => (
            <div key={req._id} className="flex items-center justify-between bg-white p-2 rounded">
              <div className="flex items-center gap-2 min-w-0">
                {req.requester.profilePhoto ? (
                  <img
                    src={getPhotoUrl(req.requester.profilePhoto)}
                    alt={req.requester.username}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] md:text-xs font-semibold text-gray-600">
                    {getInitials(req.requester.username)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-medium truncate">{req.requester.username}</div>
                  <div className="text-[11px] md:text-xs text-gray-500 truncate">{req.requester.email}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleAccept(req._id)}
                  disabled={loading}
                  className="px-2 py-1 text-[11px] md:text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  ✓
                </button>
                <button
                  onClick={() => handleReject(req._id)}
                  disabled={loading}
                  className="px-2 py-1 text-[11px] md:text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
