const asyncHandler = require('express-async-handler');
const User = require('../models/userModels');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// @desc Register a new user
// @route POST /api/users/register
// @access Public

const registerUser = asyncHandler( async (req,res) => {
    const {username, email, password, rsaPublicKey} = req.body;

    if(!username || !email || !password) {
        res.status(400);
        throw new Error("Please fill all the fields");
    }

    const userAvailable = await User.findOne({email}) // Check if user with the given email already exists

    if(userAvailable) {
        res.status(400);
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profilePhoto = req.file?.filename ? `/uploads/${req.file.filename}` : null;

    const user = await User.create({
        username,
        email,
        password: hashedPassword,
        rsaPublicKey: rsaPublicKey || null,
        profilePhoto
    });

    if(user) {
        res.status(201).json({ 
            _id: user.id, 
            email: user.email,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                profilePhoto: user.profilePhoto
            }
        });
    } else {
        res.status(400);
        throw new Error("User data is not valid");
    }
});



// @desc Login user
// @route POST /api/users/login
// @access Public

const loginUser = asyncHandler( async (req,res) => {
    const {email, password} = req.body;

    if(!email || !password) {
        res.status(400);
        throw new Error("Please fill all the fields");
    }

    const user = await User.findOne({email});

    if(user && (await bcrypt.compare(password, user.password))) {
        
        const accessToken = jwt.sign({
            user: {
                username: user.username,
                email: user.email,
                id: user.id
            },
        }, process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: "1h"}
        );
        
        // Store the current token in database and set expiration
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1);
        
        user.currentToken = accessToken;
        user.tokenExpiresAt = tokenExpiresAt;
        await user.save();
        
        res.status(200).json({
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                profilePhoto: user.profilePhoto
            }
        })
    } else {
        res.status(401);
        throw new Error("Email or password is not valid");
    }
});


// @desc Current user
// @route POST /api/users/current
// @access Public

const currentUser = asyncHandler( async (req,res) => {
    res.json(req.user)
});

const fetchUsers = asyncHandler( async (req, res) => {
    const users = await User.find({}, '-password -currentToken -tokenExpiresAt'); // Exclude sensitive fields
    res.status(200).json(users);
});

// @desc Get user by ID (for fetching public key)
// @route GET /api/users/:userId
// @access Private
const getUserById = asyncHandler( async (req, res) => {
    const user = await User.findById(req.params.userId, 'username email rsaPublicKey profilePhoto _id');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    res.status(200).json(user);
});

// @desc Update user profile
// @route PUT /api/users/profile/update
// @access Private

const updateProfile = asyncHandler( async (req, res) => {
    const { username, email } = req.body;
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    
    // Check if email is already taken by another user
    if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400);
            throw new Error('Email already in use');
        }
        user.email = email;
    }
    
    if (username) {
        user.username = username;
    }
    
    // Update profile photo if file was uploaded
    if (req.file) {
        user.profilePhoto = `/uploads/${req.file.filename}`;
    }
    
    await user.save();
    
    res.status(200).json({
        message: 'Profile updated successfully',
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profilePhoto: user.profilePhoto
        }
    });
});

// @desc Logout user
// @route POST /api/users/logout
// @access Private

const logoutUser = asyncHandler( async (req, res) => {
    const user = await User.findById(req.user.id);
    if (user) {
        user.currentToken = null;
        user.tokenExpiresAt = null;
        await user.save();
    }
    res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = { registerUser, loginUser, currentUser, fetchUsers, getUserById, updateProfile, logoutUser };