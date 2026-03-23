const express = require('express');
const router = express.Router();
const {
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    getFriendsPresence,
    getPendingRequests,
    getFriendStatus
} = require('../controllers/friendController');
const { unfriend } = require('../controllers/friendController');
const validateToken = require('../middleware/validateTokenHandler');

// All routes require authentication
router.use(validateToken);

router.get('/search', searchUsers);
router.post('/request', sendFriendRequest);
router.get('/requests/pending', getPendingRequests);
router.get('/status/:userId', getFriendStatus);
router.get('/presence', getFriendsPresence);
router.get('/', getFriends);
router.put('/request/:friendId/accept', acceptFriendRequest);
router.put('/request/:friendId/reject', rejectFriendRequest);
router.delete('/:userId', unfriend);

module.exports = router;
