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
    <div className="h-full border-r p-3 bg-white">
      <div className="font-semibold mb-3">Contacts</div>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      <div className="space-y-2 overflow-auto" style={{maxHeight: 'calc(100vh - 120px)'}}>
        {users.map(u => (
          <button
            key={u._id}
            onClick={() => onSelect(u)}
            className={`w-full text-left p-4 rounded flex items-center justify-between ${selectedId === u._id ? 'bg-sky-50 border border-sky-200' : 'hover:bg-gray-50'}`}>
            <div className="flex items-center gap-3">
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
              <div>
                <div className="font-medium">{u.name || u.username}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
            </div>
          </button>
        ))}
        {users.length === 0 && !loading && <div className="text-sm text-gray-500">No users found</div>}
      </div>
    </div>
  )
}  
