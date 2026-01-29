import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Users(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])

  useEffect(()=>{
    const load = async () => {
      try{
        const res = await api.get('/users')
        const list = res.data.filter(u => u._id !== user?.id)
        setUsers(list)
      }catch(err){
        if (err?.response?.status === 401) {
          logout()
          navigate('/login')
        }
      }
    }
    load()
  },[user, logout, navigate])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">All Users</h2>
      <div className="grid gap-3">
        {users.map(u => (
          <Link to={`/users/${u._id}`} key={u._id} className="p-3 border rounded hover:bg-gray-50 flex items-center justify-between">
            <div>
              <div className="font-medium">{u.name || u.username}</div>
              <div className="text-sm text-gray-500">{u.email}</div>
            </div>
            <div className="text-sm text-sky-600">Open</div>
          </Link>
        ))}
        {users.length === 0 && <div>No other users found.</div>}
      </div>
    </div>
  )
}
