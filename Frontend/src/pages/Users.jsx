import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

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

export default function Users(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    if (!user?.id) return // Don't fetch if user is not logged in
    
    const load = async () => {
      setLoading(true)
      setError(null)
      try{
        const res = await api.get('/users')
        
        if (!Array.isArray(res.data)) {
          throw new Error('Invalid response format')
        }
        const list = res.data.filter(u => u._id !== user?.id)
        setUsers(list)
      }catch(err){
        if (err?.response?.status === 401) {
          logout()
          navigate('/login')
        } else {
          setError(err?.response?.data?.message || 'Failed to load users')
        }
      }finally{
        setLoading(false)
      }
    }
    load()
  },[user?.id, logout, navigate])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">All Users</h2>
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}
      {loading && <div className="text-center text-gray-500">Loading users...</div>}
      {!loading && <div className="grid gap-3">
        {users.map(u => (
          <Link to={`/users/${u._id}`} key={u._id} className="p-3 border rounded hover:bg-gray-50 flex items-center justify-between">
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
                <div className="text-sm text-gray-500">{u.email}</div>
              </div>
            </div>
            <div className="text-sm text-sky-600">Open</div>
          </Link>
        ))}
        {users.length === 0 && !error && <div>No other users found.</div>}
      </div>}
    </div>
  )
}
