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
    <div className="h-full flex flex-col min-h-0 border-r border-[#d8e7e1] bg-gradient-to-b from-[#f4fbf8] via-white to-white">
      <div className="px-3 pt-3 pb-2 border-b border-[#d8e7e1] bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-[#123a33] text-sm md:text-base">Groups Hub</div>
          <button
            type="button"
            title={isCreatePanelOpen ? 'Close Create Group' : 'Create New Group'}
            aria-label={isCreatePanelOpen ? 'Close Create Group' : 'Create New Group'}
            onClick={() => setIsCreatePanelOpen((prev) => !prev)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-[#e6f6f2] text-[#0f8a79] hover:bg-[#d8f0ea] transition"
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
        <div className="mt-1 flex items-center gap-2 text-[11px] text-[#5b7a72]">
          <span className="px-2 py-0.5 rounded-full bg-[#edf4f1]">{sortedGroups.length} groups</span>
          <span className="px-2 py-0.5 rounded-full bg-[#fff0df] text-[#a05d26]">
            {pendingInvites?.length || 0} invites
          </span>
        </div>
      </div>

      {isCreatePanelOpen ? (
        <div className="flex-1 min-h-0 p-3 overflow-y-auto">
          <form onSubmit={submitCreate} className="h-full flex flex-col rounded-2xl border border-[#d8e7e1] bg-white p-3 shadow-sm">
            <div className="text-sm font-semibold text-[#123a33]">Create New Group</div>
            <div className="text-[11px] text-[#5b7a72] mt-1">Pick a name and invite teammates</div>

            <div className="mt-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Team alpha, Design pod, Weekend squad..."
                className="w-full px-3 py-2.5 text-sm border border-[#bfd4cb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8fd3c5] focus:border-[#8fd3c5]"
                maxLength={80}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-[#5b7a72]">Invite Friends</span>
              <span className="font-medium text-[#315e56] bg-[#edf4f1] px-2 py-0.5 rounded-md">{selectedCount} selected</span>
            </div>

            <div className="mt-2 flex-1 min-h-0 border border-[#d8e7e1] rounded-xl p-2.5 bg-[#f7fbf9] overflow-y-auto">
              {(friends || []).length === 0 && <div className="text-xs text-[#5b7a72]">No friends to invite yet</div>}
              <div className="space-y-1">
                {(friends || []).map((friend) => (
                  <label
                    key={friend._id}
                    className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-white cursor-pointer text-[#123a33]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriendIds.includes(friend._id)}
                      onChange={() => toggleFriend(friend._id)}
                    />
                    <span className="truncate">{friend.username || friend.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCreatePanelOpen(false)}
                disabled={isCreating}
                className="w-full px-3 py-2.5 text-sm bg-[#edf4f1] text-[#315e56] rounded-xl hover:bg-[#e1ece7] disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !canCreate}
                className="w-full px-3 py-2.5 text-sm bg-[#0f8a79] text-white rounded-xl disabled:opacity-50 hover:bg-[#0b7466] font-medium"
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
                  <div className="text-[11px] font-semibold text-[#a05d26] px-1 pb-2">
                    Pending Invites ({pendingInvites.length})
                  </div>
                  <div className="space-y-1.5">
                    {pendingInvites.map((invite) => (
                      <div key={invite.groupId} className="bg-[#fff5ea] border border-[#f3d8b8] rounded-xl p-2.5">
                        <div className="text-xs font-semibold truncate text-[#123a33]">{invite.groupName}</div>
                        <div className="text-[11px] text-[#5b7a72] truncate">Owner: {invite.owner?.username || invite.owner?.email}</div>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="flex-1 px-2 py-1.5 text-[11px] bg-[#1f9d63] text-white rounded-md hover:bg-[#187d4f] font-medium transition"
                            onClick={() => onRespondToInvite?.(invite.groupId, 'accept')}
                            type="button"
                          >
                            Accept
                          </button>
                          <button
                            className="flex-1 px-2 py-1.5 text-[11px] bg-[#dc4a5a] text-white rounded-md hover:bg-[#c33948] font-medium transition"
                            onClick={() => onRespondToInvite?.(invite.groupId, 'reject')}
                            type="button"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-b border-[#d8e7e1] mt-3 pt-1" />
                </div>
              )}
              <div className="text-[11px] font-semibold text-[#5b7a72] px-1 pb-2 sticky top-0 bg-white/95 backdrop-blur z-10">
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
                          ? 'bg-[#e7f7f3] border-[#89cfc0]'
                          : 'hover:bg-[#f7fbf9] border-[#d8e7e1]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {group.groupPhoto ? (
                          <img
                            src={getPhotoUrl(group.groupPhoto, group.updatedAt)}
                            alt={group.name}
                            className="w-9 h-9 rounded-full object-cover border border-[#d8e7e1]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#d9ece5] flex items-center justify-center text-[11px] font-semibold text-[#315e56]">
                            {getInitials(group.name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-[#123a33] flex items-center gap-2">
                            <span className="truncate">{group.name}</span>
                            {isNewest && (
                              <span className="text-[10px] uppercase tracking-wide bg-[#f08c4b] text-white px-1.5 py-0.5 rounded-md">
                                New
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5b7a72] truncate">
                            Admin: {group.owner?.username || group.owner?.email || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#5b7a72] mt-1">
                        {group.acceptedCount || 0} accepted • {group.pendingCount || 0} pending
                      </div>
                    </button>
                  );
                })}
                {sortedGroups.length === 0 && <div className="text-xs text-[#5b7a72] px-2">No groups yet</div>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
