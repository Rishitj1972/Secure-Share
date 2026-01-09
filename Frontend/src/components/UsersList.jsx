import React from 'react'

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
            <div>
              <div className="font-medium">{u.name || u.username}</div>
              <div className="text-xs text-gray-500">{u.email}</div>
            </div>
          </button>
        ))}
        {users.length === 0 && !loading && <div className="text-sm text-gray-500">No users found</div>}
      </div>
    </div>
  )
}  
