import React, { useEffect, useState } from 'react'
import UsersList from '../components/UsersList'
import GroupsList from '../components/GroupsList'
import ConversationPanel from '../components/ConversationPanel'
import SearchUsers from '../components/SearchUsers'
import FriendRequests from '../components/FriendRequests'
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
  const [groups, setGroups] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [presenceMap, setPresenceMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [latestCreatedGroupId, setLatestCreatedGroupId] = useState(null)
  const [mode, setMode] = useState('friends')
  const [note, setNote] = useState(null)

  const loadFriends = async () => {
    const res = await api.get('/friends')

    if (!Array.isArray(res.data)) {
      console.error('Expected users array, got:', res.data)
      throw new Error('Invalid users response')
    }

    setUsers(res.data)
  }

  const selectedWithPresence = selectedFriend
    ? {
        ...selectedFriend,
        isActive: !!presenceMap[selectedFriend._id]?.isActive,
        lastSeen: presenceMap[selectedFriend._id]?.lastSeen || null
      }
    : null

  const loadGroups = async () => {
    const [groupsRes, invitesRes] = await Promise.all([
      api.get('/groups'),
      api.get('/groups/invitations/pending')
    ])

    const nextGroups = Array.isArray(groupsRes.data) ? groupsRes.data : []
    setGroups(nextGroups)
    setPendingInvites(Array.isArray(invitesRes.data) ? invitesRes.data : [])
    return nextGroups
  }

  useEffect(()=>{
    if (!user?.id) return

    const load = async () =>{
      setLoading(true)
      try{
        await Promise.all([loadFriends(), loadGroups()])
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
    if (!selectedGroup?._id) return
    const refreshed = groups.find((group) => group._id === selectedGroup._id)
    if (refreshed) {
      setSelectedGroup(refreshed)
    } else {
      setSelectedGroup(null)
    }
  }, [groups, selectedGroup?._id])

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

  const refreshFriends = async () => {
    try {
      await loadFriends()
    } catch (err) {
      showNotification(err?.response?.data?.message || 'Failed to refresh friends', 'error')
    }
  }

  const createGroup = async ({ name, memberIds }) => {
    try {
      const res = await api.post('/groups', { name, memberIds })
      const createdGroupId = res?.data?.groupId || null
      setLatestCreatedGroupId(createdGroupId)
      await loadGroups()
      showNotification('Group created successfully', 'success')
    } catch (err) {
      showNotification(err?.response?.data?.message || 'Failed to create group', 'error')
      throw err
    }
  }

  const respondToInvite = async (groupId, action) => {
    try {
      await api.put(`/groups/${groupId}/invitations/respond`, { action })
      await loadGroups()
      showNotification(action === 'accept' ? 'Invitation accepted' : 'Invitation rejected', 'success')
    } catch (err) {
      showNotification(err?.response?.data?.message || 'Failed to respond to invitation', 'error')
    }
  }

  const handleGroupDeleted = async () => {
    setSelectedGroup(null)
    setLatestCreatedGroupId(null)
    await loadGroups()
    showNotification('Group deleted successfully', 'success')
  }

  return (
    <div className="h-[calc(100vh-160px)] flex bg-gradient-to-br from-slate-50 to-sky-50">
      {/* Sidebar */}
      <div className="w-full sm:w-72 lg:w-80 border-r border-slate-200 bg-white flex flex-col min-h-0 shadow-sm">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-20">
          <h1 className="font-bold text-lg text-white mb-3 flex items-center gap-2">
            <span className="text-xl">🔐</span> Secure Share
          </h1>
          
          {/* Mode Toggle */}
          <div className="flex gap-2 bg-blue-500/30 rounded-lg p-1.5">
            <button
              onClick={() => setMode('friends')}
              className={`flex-1 px-3 py-2 text-xs md:text-sm font-semibold rounded-md transition-all duration-200 ${
                mode === 'friends'
                  ? 'bg-white text-blue-700 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              👥 Friends
            </button>
            <button
              onClick={() => setMode('groups')}
              className={`flex-1 px-3 py-2 text-xs md:text-sm font-semibold rounded-md transition-all duration-200 ${
                mode === 'groups'
                  ? 'bg-white text-blue-700 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              👫 Groups
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {mode === 'friends' ? (
            <>
              <div className="px-3 py-3 border-b border-slate-200 flex-shrink-0">
                <SearchUsers showNotification={showNotification} onFriendAdded={refreshFriends} />
              </div>
              <div className="px-3 py-2 border-b border-slate-200 flex-shrink-0">
                <FriendRequests showNotification={showNotification} onRefresh={refreshFriends} />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <UsersList
                  users={users}
                  presenceMap={presenceMap}
                  selectedId={selectedFriend?._id}
                  onSelect={(u) => {
                    setSelectedFriend(u)
                    setSelectedGroup(null)
                  }}
                  loading={loading}
                />
              </div>
            </>
          ) : (
            <GroupsList
              groups={groups}
              pendingInvites={pendingInvites}
              friends={users}
              latestCreatedGroupId={latestCreatedGroupId}
              selectedGroupId={selectedGroup?._id}
              loading={loading}
              onCreateGroup={createGroup}
              onRespondToInvite={respondToInvite}
              onSelectGroup={(group) => {
                setSelectedGroup(group)
                setSelectedFriend(null)
              }}
            />
          )}
        </div>
      </div>

      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
        <ConversationPanel
          userId={selectedFriend?._id}
          userObj={selectedWithPresence}
          groupObj={selectedGroup}
          friends={users}
          onRefreshGroups={loadGroups}
          onGroupDeleted={handleGroupDeleted}
          showNotification={showNotification}
        />
      </div>

      <Notification note={note} />
    </div>
  )
}
