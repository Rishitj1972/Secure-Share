const asyncHandler = require('express-async-handler');
const Friend = require('../models/Friend');
const User = require('../models/userModels');

// @desc Search users by username
// @route GET /api/friends/search?q=username
// @access Private
const searchUsers = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length === 0) {
        res.status(400);
        throw new Error('Search query is required');
    }

    // Search for users matching the username/email
    const users = await User.find(
        {
            $and: [
                { _id: { $ne: userId } }, // Exclude current user
                {
                    $or: [
                        { username: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        },
        '_id username email profilePhoto'
    ).limit(20);

    // Get friend status for each user
    const usersWithStatus = await Promise.all(
        users.map(async (user) => {
            const friendship = await Friend.findOne({
                $or: [
                    { requester: userId, receiver: user._id },
                    { requester: user._id, receiver: userId }
                ]
            });

            return {
                ...user.toObject(),
                friendStatus: friendship ? friendship.status : 'none',
                isRequester: friendship?.requester.toString() === userId.toString()
            };
        })
    );

    res.status(200).json(usersWithStatus);
});

// @desc Send friend request
// @route POST /api/friends/request
// @access Private
const sendFriendRequest = asyncHandler(async (req, res) => {
    const { receiverId } = req.body;
    const userId = req.user.id;

    if (!receiverId) {
        res.status(400);
        throw new Error('Receiver ID is required');
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
        res.status(404);
        throw new Error('User not found');
    }

    // Check if already friends or request already sent
    const existingFriend = await Friend.findOne({
        $or: [
            { requester: userId, receiver: receiverId },
            { requester: receiverId, receiver: userId }
        ]
    });

    if (existingFriend) {
        res.status(400);
        throw new Error(`Friend request already ${existingFriend.status}`);
    }

    const friendship = await Friend.create({
        requester: userId,
        receiver: receiverId,
        status: 'pending'
    });

    res.status(201).json({
        message: 'Friend request sent',
        friendship
    });
});

// @desc Accept friend request
// @route PUT /api/friends/request/:friendId/accept
// @access Private
const acceptFriendRequest = asyncHandler(async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user.id;

    const friendship = await Friend.findById(friendId);
    if (!friendship) {
        res.status(404);
        throw new Error('Friend request not found');
    }

    // Check if user is the receiver
    if (friendship.receiver.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('You can only accept requests sent to you');
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.status(200).json({
        message: 'Friend request accepted',
        friendship
    });
});

// @desc Reject friend request
// @route PUT /api/friends/request/:friendId/reject
// @access Private
const rejectFriendRequest = asyncHandler(async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user.id;

    const friendship = await Friend.findById(friendId);
    if (!friendship) {
        res.status(404);
        throw new Error('Friend request not found');
    }

    // Check if user is the receiver
    if (friendship.receiver.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('You can only reject requests sent to you');
    }

    friendship.status = 'rejected';
    await friendship.save();

    res.status(200).json({
        message: 'Friend request rejected',
        friendship
    });
});

// @desc Get friends list
// @route GET /api/friends
// @access Private
const getFriends = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get all accepted friendships
    const friendships = await Friend.find(
        {
            $and: [
                { status: 'accepted' },
                {
                    $or: [
                        { requester: userId },
                        { receiver: userId }
                    ]
                }
            ]
        }
    ).populate('requester receiver', 'username email profilePhoto _id');

    // Extract friend details
    const friends = friendships.map(friendship => {
        const friend = friendship.requester._id.toString() === userId.toString()
            ? friendship.receiver
            : friendship.requester;
        return friend;
    });

    res.status(200).json(friends);
});

// @desc Get pending friend requests
// @route GET /api/friends/requests/pending
// @access Private
const getPendingRequests = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const requests = await Friend.find({
        receiver: userId,
        status: 'pending'
    }).populate('requester', 'username email profilePhoto _id');

    res.status(200).json(requests);
});

// @desc Get friend request status with specific user
// @route GET /api/friends/status/:userId
// @access Private
const getFriendStatus = asyncHandler(async (req, res) => {
    const { userId: targetUserId } = req.params;
    const userId = req.user.id;

    const friendship = await Friend.findOne({
        $or: [
            { requester: userId, receiver: targetUserId },
            { requester: targetUserId, receiver: userId }
        ]
    });

    res.status(200).json({
        status: friendship ? friendship.status : 'none',
        isRequester: friendship?.requester.toString() === userId.toString(),
        friendshipId: friendship?._id
    });
});

module.exports = {
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    getPendingRequests,
    getFriendStatus
};
