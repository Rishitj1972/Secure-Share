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
  const [presenceMap, setPresenceMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState(null)

  const selectedWithPresence = selected
    ? {
        ...selected,
        isActive: !!presenceMap[selected._id]?.isActive,
        lastSeen: presenceMap[selected._id]?.lastSeen || null
      }
    : null

  useEffect(()=>{
    if (!user?.id) return

    const load = async () =>{
      setLoading(true)
      try{
        const res = await api.get('/friends')

        // 🔒 SAFETY CHECK (MANDATORY)
    if (!Array.isArray(res.data)) {
      console.error('Expected users array, got:', res.data)
      throw new Error('Invalid users response')
    }

        setUsers(res.data)
      }catch(err){
        console.error(err)
        setNote({ text: err?.response?.data?.message || 'Failed to load friends', type: 'error' })
      }finally{
        setLoading(false)
      }
    }
    load()
  },[user?.id])

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false

    const loadPresence = async () => {
      try {
        const res = await api.get('/friends/presence')
        if (cancelled || !Array.isArray(res.data)) return

        const nextMap = {}
        res.data.forEach((item) => {
          const id = item?.userId?._id || item?.userId
          if (!id) return
          nextMap[id] = {
            isActive: !!item.isActive,
            lastSeen: item.lastSeen || null
          }
        })
        setPresenceMap(nextMap)
      } catch (_) {
        // Non-critical polling error
      }
    }

    loadPresence()
    const intervalId = setInterval(loadPresence, 10000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [user?.id])

  const showNotification = (text, type='success') => {
    setNote({ text, type })
    setTimeout(()=> setNote(null), 3500)
  }

  return (
    <div className="h-[calc(100vh-160px)] flex bg-gray-50">
      <div className="w-64">
        <UsersList users={users} presenceMap={presenceMap} selectedId={selected?._id} onSelect={u=>setSelected(u)} loading={loading} />
      </div>
      <div className="flex-1">
        <ConversationPanel userId={selected?._id} userObj={selectedWithPresence} showNotification={showNotification} />
      </div>
      <Notification note={note} />
    </div>
  )
}
