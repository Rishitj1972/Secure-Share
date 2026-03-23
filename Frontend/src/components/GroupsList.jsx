import React, { useMemo, useState } from 'react';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const uploadsBase = baseURL.replace(/\/api\/?$/, '')

function getPhotoUrl(photo, timestamp) {
  if (!photo) return ''
  if (photo.startsWith('http')) return photo
  const url = `${uploadsBase}${photo}`
  // Add cache buster using timestamp if provided
  if (timestamp) {
    return `${url}?t=${timestamp}`
  }
  return url
}

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean)
  const first = parts[0]?.[0] || ''
  const second = parts[1]?.[0] || ''
  return (first + second).toUpperCase() || '?'
}

export default function GroupsList({
  groups,
  pendingInvites,
  friends,
  latestCreatedGroupId,
  selectedGroupId,
  loading,
  onSelectGroup,
  onCreateGroup,
  onRespondToInvite
}) {
  const [name, setName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);

  const sortedGroups = useMemo(() => {
    return [...(groups || [])].sort((a, b) => {
      if (latestCreatedGroupId) {
        if (a._id === latestCreatedGroupId) return -1;
        if (b._id === latestCreatedGroupId) return 1;
      }

      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [groups, latestCreatedGroupId]);

  const selectedCount = selectedFriendIds.length;
  const canCreate = !!name.trim();

  const toggleFriend = (friendId) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreateGroup?.({
        name: name.trim(),
        memberIds: selectedFriendIds
      });
      setName('');
      setSelectedFriendIds([]);
      setIsCreatePanelOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 border-r border-slate-200 bg-gradient-to-b from-rose-50/50 via-white to-white">
      <div className="px-3 pt-3 pb-2 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-900 text-sm md:text-base">Groups Hub</div>
          <button
            type="button"
            title={isCreatePanelOpen ? 'Close Create Group' : 'Create New Group'}
            aria-label={isCreatePanelOpen ? 'Close Create Group' : 'Create New Group'}
            onClick={() => setIsCreatePanelOpen((prev) => !prev)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 transition"
          >
            {isCreatePanelOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            )}
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="px-2 py-0.5 rounded-full bg-slate-100">{sortedGroups.length} groups</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            {pendingInvites?.length || 0} invites
          </span>
        </div>
      </div>

      {isCreatePanelOpen ? (
        <div className="flex-1 min-h-0 p-3 overflow-y-auto">
          <form onSubmit={submitCreate} className="h-full flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-sm font-semibold text-slate-800">Create New Group</div>
            <div className="text-[11px] text-slate-500 mt-1">Pick a name and invite teammates</div>

            <div className="mt-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Team alpha, Design pod, Weekend squad..."
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-300"
                maxLength={80}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Invite Friends</span>
              <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{selectedCount} selected</span>
            </div>

            <div className="mt-2 flex-1 min-h-0 border border-slate-200 rounded-xl p-2.5 bg-slate-50 overflow-y-auto">
              {(friends || []).length === 0 && <div className="text-xs text-slate-500">No friends to invite yet</div>}
              <div className="space-y-1">
                {(friends || []).map((friend) => (
                  <label
                    key={friend._id}
                    className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriendIds.includes(friend._id)}
                      onChange={() => toggleFriend(friend._id)}
                    />
                    <span className="truncate text-slate-700">{friend.username || friend.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCreatePanelOpen(false)}
                disabled={isCreating}
                className="w-full px-3 py-2.5 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !canCreate}
                className="w-full px-3 py-2.5 text-sm bg-slate-900 text-white rounded-xl disabled:opacity-50 hover:bg-slate-800 font-medium"
              >
                {isCreating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {loading && <div className="text-xs text-slate-500 px-3 py-3">Loading groups...</div>}
          {!loading && (
            <div className="flex-1 min-h-0 px-2 py-2 pr-1 overflow-y-auto border-b border-slate-200">
              {(pendingInvites || []).length > 0 && (
                <div className="mb-3">
                  <div className="text-[11px] font-semibold text-amber-700 px-1 pb-2">
                    Pending Invites ({pendingInvites.length})
                  </div>
                  <div className="space-y-1.5">
                    {pendingInvites.map((invite) => (
                      <div key={invite.groupId} className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                        <div className="text-xs font-semibold truncate text-slate-800">{invite.groupName}</div>
                        <div className="text-[11px] text-slate-600 truncate">Owner: {invite.owner?.username || invite.owner?.email}</div>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="flex-1 px-2 py-1.5 text-[11px] bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium transition"
                            onClick={() => onRespondToInvite?.(invite.groupId, 'accept')}
                            type="button"
                          >
                            Accept
                          </button>
                          <button
                            className="flex-1 px-2 py-1.5 text-[11px] bg-rose-600 text-white rounded-md hover:bg-rose-700 font-medium transition"
                            onClick={() => onRespondToInvite?.(invite.groupId, 'reject')}
                            type="button"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-b border-slate-200 mt-3 pt-1" />
                </div>
              )}
              <div className="text-[11px] font-semibold text-slate-500 px-1 pb-2 sticky top-0 bg-white/95 backdrop-blur z-10">
                Your Groups
              </div>
              <div className="space-y-1.5">
                {sortedGroups.map((group) => {
                  const isNewest = latestCreatedGroupId && group._id === latestCreatedGroupId;
                  return (
                    <button
                      key={group._id}
                      onClick={() => onSelectGroup?.(group)}
                      className={`w-full text-left p-2.5 rounded-xl text-sm border transition ${
                        selectedGroupId === group._id
                          ? 'bg-rose-100/70 border-rose-300'
                          : 'hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {group.groupPhoto ? (
                          <img
                            src={getPhotoUrl(group.groupPhoto, group.updatedAt)}
                            alt={group.name}
                            className="w-9 h-9 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-[11px] font-semibold text-rose-700">
                            {getInitials(group.name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-slate-800 flex items-center gap-2">
                            <span className="truncate">{group.name}</span>
                            {isNewest && (
                              <span className="text-[10px] uppercase tracking-wide bg-rose-600 text-white px-1.5 py-0.5 rounded-md">
                                New
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Admin: {group.owner?.username || group.owner?.email || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {group.acceptedCount || 0} accepted • {group.pendingCount || 0} pending
                      </div>
                    </button>
                  );
                })}
                {sortedGroups.length === 0 && <div className="text-xs text-slate-500 px-2">No groups yet</div>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
