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
      <div className="font-semibold px-4 py-3 text-slate-900 border-b border-slate-100 text-sm md:text-base bg-slate-50">👥 Your Contacts</div>
      {loading && <div className="text-xs md:text-sm text-slate-500 px-4 py-3">Loading contacts...</div>}
      {!loading && (
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 contacts-scroll">
          <div className="space-y-1 px-2 py-2">
            {sortedUsers.map(u => {
              const isActive = !!presenceMap[u._id]?.isActive
              return (
              <button
                key={u._id}
                onClick={() => onSelect(u)}
                className={`w-full text-left px-3 py-2.5 md:py-3 rounded-lg flex items-center gap-2.5 md:gap-3 transition-all duration-200 border border-transparent ${selectedId === u._id ? 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200 shadow-md' : 'hover:bg-slate-50 hover:border-slate-200'}`}>
                <div className="flex-shrink-0">
                  {u.profilePhoto ? (
                    <img
                      src={getPhotoUrl(u.profilePhoto)}
                      alt={u.username || u.name}
                      className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs md:text-sm font-bold text-white shadow-md">
                      {getInitials(u.name || u.username)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate text-sm md:text-base">{u.name || u.username}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] md:text-xs text-slate-500 truncate">{u.email}</span>
                    <span className={`inline-flex items-center text-[10px] md:text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isActive ? '●' : '◯'}
                  </div>
                </div>
              </button>
              )
            })}
            {sortedUsers.length === 0 && <div className="text-xs md:text-sm text-slate-500 px-4 py-6 text-center">No contacts yet.<br/>Search users to add friends!</div>}
          </div>
        </div>
      )}
    </div>
  )
}
