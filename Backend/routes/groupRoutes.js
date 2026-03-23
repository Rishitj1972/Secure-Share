const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/validateTokenHandler');
const groupUpload = require('../config/groupMulter');
const {
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
} = require('../controllers/groupController');

router.use(validateToken);

router.post('/', createGroup);
router.get('/', getMyGroups);
router.get('/invitations/pending', getPendingInvitations);
// Specific routes before generic :groupId routes
router.put('/:groupId/photo', groupUpload.single('groupPhoto'), updateGroupPhoto);
router.put('/:groupId/invitations/respond', respondToInvitation);
// Generic routes after specific ones
router.post('/:groupId/invite', inviteMembers);
router.put('/:groupId', updateGroupDetails);
router.put('/:groupId/leave', leaveGroup);
router.delete('/:groupId', deleteGroup);
router.delete('/:groupId/members/:memberId', removeMember);
router.get('/:groupId/files', getGroupFiles);
router.delete('/:groupId/files/:fileId', deleteGroupFile);
router.get('/:groupId/members', getGroupMembers);

module.exports = router;
