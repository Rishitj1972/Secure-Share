import React, { useMemo } from 'react'

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

export default function UsersList({ users, presenceMap = {}, selectedId, onSelect, loading }){
  const sortedUsers = useMemo(() => {
    const list = Array.isArray(users) ? [...users] : []
    return list.sort((a, b) => {
      const aActive = !!presenceMap[a._id]?.isActive
      const bActive = !!presenceMap[b._id]?.isActive

      if (aActive !== bActive) {
        return aActive ? -1 : 1
      }

      const aName = (a.name || a.username || '').toLowerCase()
      const bName = (b.name || b.username || '').toLowerCase()
      return aName.localeCompare(bName)
    })
  }, [users, presenceMap])

  return (
    <div className="h-full flex flex-col bg-white min-h-0">
      <div className="font-semibold px-4 py-3 text-[#123a33] border-b border-[#d9e8e2] text-sm md:text-base bg-[#f6fcf9]">Your Contacts</div>
      {loading && <div className="text-xs md:text-sm text-[#5b7a72] px-4 py-3">Loading contacts...</div>}
      {!loading && (
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 contacts-scroll">
          <div className="space-y-1 px-2 py-2">
            {sortedUsers.map(u => {
              const isActive = !!presenceMap[u._id]?.isActive
              return (
              <button
                key={u._id}
                onClick={() => onSelect(u)}
                className={`w-full text-left px-3 py-2.5 md:py-3 rounded-xl flex items-center gap-2.5 md:gap-3 transition-all duration-200 border ${selectedId === u._id ? 'bg-gradient-to-r from-[#ebfaf5] to-[#f4fcf9] border-[#8fd3c5] shadow-sm' : 'border-transparent hover:bg-[#f7fbf9] hover:border-[#d5e7df]'}`}>
                <div className="flex-shrink-0">
                  {u.profilePhoto ? (
                    <img
                      src={getPhotoUrl(u.profilePhoto)}
                      alt={u.username || u.name}
                      className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-[#d8e7e1] shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-[#1ab8a1] to-[#0f8a79] flex items-center justify-center text-xs md:text-sm font-bold text-white shadow-md">
                      {getInitials(u.name || u.username)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#123a33] truncate text-sm md:text-base">{u.name || u.username}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] md:text-xs text-[#5b7a72] truncate">{u.email}</span>
                    <span className={`inline-flex items-center text-[10px] md:text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-[#e5f8ef] text-[#1d855a]' : 'bg-[#edf4f1] text-[#58756d]'}`}>
                      {isActive ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </button>
              )
            })}
            {sortedUsers.length === 0 && <div className="text-xs md:text-sm text-[#5b7a72] px-4 py-6 text-center">No contacts yet.<br/>Search users to add friends.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
