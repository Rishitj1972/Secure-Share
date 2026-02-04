import React from 'react'

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

export default function UsersList({ users, selectedId, onSelect, loading }){
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="font-semibold mb-3 px-3 pt-3 text-gray-800">👥 Contacts</div>
      {loading && <div className="text-sm text-gray-500 px-3">Loading...</div>}
      <div className="space-y-1 overflow-auto flex-1 px-2">
        {users.map(u => (
          <button
            key={u._id}
            onClick={() => onSelect(u)}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedId === u._id ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'}`}>
            <div className="flex-shrink-0">
              {u.profilePhoto ? (
                <img
                  src={getPhotoUrl(u.profilePhoto)}
                  alt={u.username || u.name}
                  className="w-10 h-10 rounded-full object-cover border"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                  {getInitials(u.name || u.username)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{u.name || u.username}</div>
              <div className="text-xs text-gray-500 truncate">{u.email}</div>
            </div>
          </button>
        ))}
        {users.length === 0 && !loading && <div className="text-sm text-gray-500 px-3 py-4 text-center">No contacts yet. Search users to add friends!</div>}
      </div>
    </div>
  )
}
