const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const Group = require('../models/Group');
const User = require('../models/userModels');
const File = require('../models/File');

const toObjectIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const isOwner = (group, userId) => toObjectIdString(group.owner) === toObjectIdString(userId);

const isAcceptedMember = (group, userId) =>
  group.members.some(
    (member) =>
      toObjectIdString(member.user) === toObjectIdString(userId) && member.status === 'accepted'
  );

const deleteUploadedFile = (relativePath) => {
  if (!relativePath) return;
  const normalized = relativePath.replace(/^\/+/, '').replace(/\//g, path.sep);
  const absolutePath = path.resolve(__dirname, '..', normalized);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

// @desc Create a new group and optionally invite members
// @route POST /api/groups
// @access Private
const createGroup = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, memberIds = [] } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Group name is required');
  }

  const uniqueMemberIds = [...new Set((Array.isArray(memberIds) ? memberIds : []).map(String))]
    .filter((id) => id !== toObjectIdString(userId));

  const users = uniqueMemberIds.length
    ? await User.find({ _id: { $in: uniqueMemberIds } }).select('_id')
    : [];

  const validUserIds = users.map((u) => toObjectIdString(u._id));

  const members = [
    {
      user: userId,
      role: 'owner',
      status: 'accepted',
      invitedBy: userId,
      joinedAt: new Date()
    },
    ...validUserIds.map((memberId) => ({
      user: memberId,
      role: 'member',
      status: 'pending',
      invitedBy: userId,
      joinedAt: null
    }))
  ];

  const group = await Group.create({
    name: name.trim(),
    owner: userId,
    members
  });

  res.status(201).json({
    message: 'Group created successfully',
    groupId: group._id,
    invitedCount: validUserIds.length
  });
});

// @desc List my groups (accepted membership)
// @route GET /api/groups
// @access Private
const getMyGroups = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const groups = await Group.find({
    members: {
      $elemMatch: {
        user: userId,
        status: 'accepted'
      }
    }
  })
    .populate('owner', '_id username email profilePhoto')
    .select('_id name owner groupPhoto members createdAt updatedAt')
    .lean();

  const result = groups.map((group) => {
    const acceptedCount = group.members.filter((m) => m.status === 'accepted').length;
    const pendingCount = group.members.filter((m) => m.status === 'pending').length;
    return {
      _id: group._id,
      name: group.name,
      owner: group.owner,
      groupPhoto: group.groupPhoto || null,
      acceptedCount,
      pendingCount,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    };
  });

  res.status(200).json(result);
});

// @desc Get pending group invitations for current user
// @route GET /api/groups/invitations/pending
// @access Private
const getPendingInvitations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const groups = await Group.find({
    members: {
      $elemMatch: {
        user: userId,
        status: 'pending'
      }
    }
  })
    .populate('owner', 'username email profilePhoto _id')
    .select('_id name owner groupPhoto members createdAt')
    .lean();

  const invitations = groups.map((group) => ({
    groupId: group._id,
    groupName: group.name,
    owner: group.owner,
    groupPhoto: group.groupPhoto || null,
    invitedAt: group.createdAt
  }));

  res.status(200).json(invitations);
});

// @desc Invite users to an existing group
// @route POST /api/groups/:groupId/invite
// @access Private (owner only)
const inviteMembers = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  const { memberIds = [] } = req.body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    res.status(400);
    throw new Error('memberIds array is required');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (!isOwner(group, userId)) {
    res.status(403);
    throw new Error('Only the group owner can invite members');
  }

  const uniqueMemberIds = [...new Set(memberIds.map(String))]
    .filter((id) => id !== toObjectIdString(userId));

  const users = uniqueMemberIds.length
    ? await User.find({ _id: { $in: uniqueMemberIds } }).select('_id')
    : [];

  const validUserIds = users.map((u) => toObjectIdString(u._id));

  let invitedCount = 0;
  for (const memberId of validUserIds) {
    const existing = group.members.find(
      (member) => toObjectIdString(member.user) === memberId
    );

    if (existing) {
      if (existing.status === 'rejected') {
        existing.status = 'pending';
        existing.invitedBy = userId;
        existing.joinedAt = null;
        invitedCount += 1;
      }
      continue;
    }

    group.members.push({
      user: memberId,
      role: 'member',
      status: 'pending',
      invitedBy: userId,
      joinedAt: null
    });
    invitedCount += 1;
  }

  await group.save();

  res.status(200).json({
    message: 'Invitations processed',
    invitedCount
  });
});

// @desc Accept or reject group invitation
// @route PUT /api/groups/:groupId/invitations/respond
// @access Private (invited user only)
const respondToInvitation = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  const { action } = req.body;

  if (!['accept', 'reject'].includes(action)) {
    res.status(400);
    throw new Error('action must be either accept or reject');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  const member = group.members.find(
    (m) => toObjectIdString(m.user) === toObjectIdString(userId)
  );

  if (!member || member.status !== 'pending') {
    res.status(404);
    throw new Error('No pending invitation found for this group');
  }

  if (action === 'accept') {
    member.status = 'accepted';
    member.joinedAt = new Date();
  } else {
    member.status = 'rejected';
    member.joinedAt = null;
  }

  await group.save();

  res.status(200).json({
    message: action === 'accept' ? 'Invitation accepted' : 'Invitation rejected'
  });
});

// @desc Update group metadata (name/admin)
// @route PUT /api/groups/:groupId
// @access Private (owner only)
const updateGroupDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  const { name, adminId } = req.body;

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (!isOwner(group, userId)) {
    res.status(403);
    throw new Error('Only the group admin can edit group details');
  }

  if (typeof name === 'string') {
    const trimmed = name.trim();
    if (!trimmed) {
      res.status(400);
      throw new Error('Group name cannot be empty');
    }
    group.name = trimmed;
  }

  if (adminId) {
    const nextAdminId = String(adminId);
    const nextAdminMember = group.members.find(
      (member) => toObjectIdString(member.user) === nextAdminId && member.status === 'accepted'
    );

    if (!nextAdminMember) {
      res.status(400);
      throw new Error('Group admin must be an accepted member');
    }

    const currentOwnerId = toObjectIdString(group.owner);
    if (currentOwnerId !== nextAdminId) {
      const currentOwnerMember = group.members.find(
        (member) => toObjectIdString(member.user) === currentOwnerId
      );
      if (currentOwnerMember) {
        currentOwnerMember.role = 'member';
      }

      nextAdminMember.role = 'owner';
      group.owner = nextAdminId;
    }
  }

  await group.save();

  const updated = await Group.findById(groupId)
    .populate('owner', '_id username email profilePhoto')
    .select('_id name owner groupPhoto members createdAt updatedAt')
    .lean();

  const acceptedCount = updated.members.filter((m) => m.status === 'accepted').length;
  const pendingCount = updated.members.filter((m) => m.status === 'pending').length;

  res.status(200).json({
    message: 'Group updated successfully',
    group: {
      _id: updated._id,
      name: updated.name,
      owner: updated.owner,
      groupPhoto: updated.groupPhoto || null,
      acceptedCount,
      pendingCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  });
});

// @desc Update group photo
// @route PUT /api/groups/:groupId/photo
// @access Private (owner only)
const updateGroupPhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (!isOwner(group, userId)) {
    res.status(403);
    throw new Error('Only the group admin can update group photo');
  }

  const removePhoto = req.body?.removePhoto === 'true' || req.body?.removePhoto === true;

  if (removePhoto) {
    if (group.groupPhoto) {
      try {
        deleteUploadedFile(group.groupPhoto);
      } catch (_) {
        // Non-fatal: keep DB update even if file is already gone.
      }
    }
    group.groupPhoto = null;
    await group.save();

    return res.status(200).json({
      message: 'Group photo removed successfully',
      groupPhoto: null
    });
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Group photo file is required');
  }

  if (group.groupPhoto) {
    try {
      deleteUploadedFile(group.groupPhoto);
    } catch (_) {
      // Non-fatal: keep DB update even if old file is already gone.
    }
  }

  group.groupPhoto = `/uploads/groups/${req.file.filename}`;
  await group.save();

  res.status(200).json({
    message: 'Group photo updated successfully',
    groupPhoto: group.groupPhoto
  });
});

// @desc Get accepted members for a group
// @route GET /api/groups/:groupId/members
// @access Private (accepted members only)
const getGroupMembers = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .populate('members.user', '_id username email profilePhoto rsaPublicKey')
    .populate('owner', '_id username email profilePhoto')
    .lean();

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  const canView = isOwner(group, userId) || isAcceptedMember(group, userId);
  if (!canView) {
    res.status(403);
    throw new Error('Not authorized to view this group');
  }

  const members = group.members.map((member) => ({
    user: member.user,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt
  }));

  res.status(200).json({
    _id: group._id,
    name: group.name,
    owner: group.owner,
    members
  });
});

// @desc Get files shared in a group
// @route GET /api/groups/:groupId/files
// @access Private (accepted members or owner)
const getGroupFiles = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;

  const group = await Group.findById(groupId)
    .select('_id owner members')
    .lean();

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  const canView = isOwner(group, userId) || isAcceptedMember(group, userId);
  if (!canView) {
    res.status(403);
    throw new Error('Not authorized to view this group');
  }

  const files = await File.find({
    group: groupId
  })
    .sort({ createdAt: -1 })
    .populate('sender', 'username email profilePhoto')
    .populate('receiver', 'username email profilePhoto')
    .select('_id originalFileName fileSize mimeType sender receiver createdAt isDownloaded encryptedAesKey encryptedAesKeys iv fileHash isEncrypted group groupShareId')
    .lean();

  const grouped = new Map();

  for (const file of files) {
    const key = file.groupShareId || file._id.toString();
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(file);
  }

  const feed = [];
  for (const [, records] of grouped) {
    const forCurrentUser = records.find((record) => toObjectIdString(record.receiver) === toObjectIdString(userId));
    const fromCurrentUser = records.find((record) => toObjectIdString(record.sender) === toObjectIdString(userId));
    const target = forCurrentUser || fromCurrentUser || records[0];
    const encryptedAesKeys = target?.encryptedAesKeys || {};
    const keyForCurrentUser = target?.encryptedAesKey || encryptedAesKeys[toObjectIdString(userId)] || null;
    const keyCount = encryptedAesKeys ? Object.keys(encryptedAesKeys).length : 0;

    const base = records[0];
    feed.push({
      ...base,
      _id: target._id,
      receiver: target.receiver,
      encryptedAesKey: keyForCurrentUser,
      iv: target.iv,
      fileHash: target.fileHash,
      isDownloaded: target.isDownloaded,
      encryptedAesKeys: undefined,
      sharedToCount: keyCount > 0 ? keyCount : records.length
    });
  }

  feed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json(feed);
});

// @desc Remove a member from group
// @route DELETE /api/groups/:groupId/members/:memberId
// @access Private (owner only)
const removeMember = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId, memberId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (!isOwner(group, userId)) {
    res.status(403);
    throw new Error('Only the group admin can remove members');
  }

  const ownerId = toObjectIdString(group.owner);
  if (toObjectIdString(memberId) === ownerId) {
    res.status(400);
    throw new Error('Group admin cannot be removed');
  }

  const beforeCount = group.members.length;
  group.members = group.members.filter(
    (member) => toObjectIdString(member.user) !== toObjectIdString(memberId)
  );

  if (group.members.length === beforeCount) {
    res.status(404);
    throw new Error('Member not found in group');
  }

  await group.save();

  res.status(200).json({
    message: 'Member removed successfully'
  });
});

// @desc Delete a file shared in a group
// @route DELETE /api/groups/:groupId/files/:fileId
// @access Private (owner only)
const deleteGroupFile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId, fileId } = req.params;

  const group = await Group.findById(groupId).select('_id owner');
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (!isOwner(group, userId)) {
    res.status(403);
    throw new Error('Only the group admin can delete group files');
  }

  const target = await File.findOne({ _id: fileId, group: groupId })
    .select('_id groupShareId filePath')
    .lean();

  if (!target) {
    res.status(404);
    throw new Error('Group file not found');
  }

  const query = target.groupShareId
    ? { group: groupId, groupShareId: target.groupShareId }
    : { _id: fileId, group: groupId };

  const relatedFiles = await File.find(query)
    .select('_id filePath')
    .lean();

  for (const file of relatedFiles) {
    try {
      deleteUploadedFile(file.filePath);
    } catch (_) {
      // Non-fatal: continue db cleanup even if disk cleanup partially fails.
    }
  }

  const deleted = await File.deleteMany(query);

  res.status(200).json({
    message: 'Group file deleted successfully',
    deletedCount: deleted.deletedCount || 0
  });
});

// @desc Delete a group
// @route DELETE /api/groups/:groupId
// @access Private (owner only)
const deleteGroup = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;

  const group = await Group.findById(groupId).select('_id owner groupPhoto').lean();
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (!isOwner(group, userId)) {
    res.status(403);
    throw new Error('Only the group admin can delete this group');
  }

  const groupFiles = await File.find({ group: groupId })
    .select('_id filePath')
    .lean();

  const uniquePaths = [...new Set(groupFiles.map((file) => file.filePath).filter(Boolean))];
  for (const filePath of uniquePaths) {
    try {
      deleteUploadedFile(filePath);
    } catch (_) {
      // Non-fatal: continue cleanup.
    }
  }

  await File.deleteMany({ group: groupId });

  if (group.groupPhoto) {
    try {
      deleteUploadedFile(group.groupPhoto);
    } catch (_) {
      // Non-fatal: continue cleanup.
    }
  }

  await Group.deleteOne({ _id: groupId });

  res.status(200).json({
    message: 'Group deleted successfully'
  });
});

// @desc Leave a group (remove self from members)
// @route PUT /api/groups/:groupId/leave
// @access Private (accepted members only)
const leaveGroup = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (isOwner(group, userId)) {
    res.status(400);
    throw new Error('Group owner cannot leave the group. Transfer ownership or delete the group instead.');
  }

  const memberIndex = group.members.findIndex(
    (m) => toObjectIdString(m.user) === toObjectIdString(userId) && m.status === 'accepted'
  );

  if (memberIndex === -1) {
    res.status(404);
    throw new Error('You are not an accepted member of this group');
  }

  group.members.splice(memberIndex, 1);
  await group.save();

  res.status(200).json({
    message: 'You have left the group successfully'
  });
});

module.exports = {
  createGroup,
  getMyGroups,
  getPendingInvitations,
  inviteMembers,
  respondToInvitation,
  updateGroupDetails,
  updateGroupPhoto,
  getGroupMembers,
  getGroupFiles,
  removeMember,
  deleteGroupFile,
  deleteGroup,
  leaveGroup
};
