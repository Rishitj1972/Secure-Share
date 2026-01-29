import React, { useEffect, useState } from 'react'
import UsersList from '../components/UsersList'
import ConversationPanel from '../components/ConversationPanel'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

function Notification({ note }){
  if(!note) return null
  return (
    <div className={`fixed right-4 top-4 px-4 py-2 rounded shadow ${note.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
      {note.text}
    </div>
  )
}

export default function Chat(){
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState(null)

  useEffect(()=>{
    if (!user?.id) return // Don't fetch if user is not logged in
    
    const load = async () =>{
      setLoading(true)
      try{
        const res = await api.get('/users')

        if (!Array.isArray(res.data)) {
          throw new Error('Server returned invalid users data')
        }

        const list = res.data.filter(u => u._id !== user?.id)
        setUsers(list)
        setNote(null) // Clear any previous errors
      }catch(err){
        if (err.response?.status === 401) {
          setNote({ text: 'Session expired. Please login again.', type: 'error' })
        } else if (err.response?.status === 500) {
          setNote({ text: 'Server error. Please try again later.', type: 'error' })
        } else {
          setNote({ text: err?.response?.data?.message || 'Failed to load users', type: 'error' })
        }
      }finally{
        setLoading(false)
      }
    }
    load()
  },[user?.id])

  const showNotification = (text, type='success') => {
    setNote({ text, type })
    setTimeout(()=> setNote(null), 3500)
  }

  return (
    <div className="h-[calc(100vh-160px)] flex bg-gray-50">
      <div className="w-64">
        <UsersList users={users} selectedId={selected?._id} onSelect={u=>setSelected(u)} loading={loading} />
      </div>
      <div className="flex-1">
        <ConversationPanel userId={selected?._id} userObj={selected} showNotification={showNotification} />
      </div>
      <Notification note={note} />
    </div>
  )
}
