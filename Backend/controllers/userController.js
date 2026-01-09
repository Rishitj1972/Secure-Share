const asyncHandler = require('express-async-handler');
const User = require('../models/userModels');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// @desc Register a new user
// @route POST /api/users/register
// @access Public

const registerUser = asyncHandler( async (req,res) => {

    console.log(req.body); // Log the request body to the console

    const {username, email, password} = req.body; // Destructure username, email, and password from request body

    if(!username || !email || !password) {
        res.status(400);
        throw new Error("Please fill all the fields");
    }

    const userAvailable = await User.findOne({email}) // Check if user with the given email already exists

    if(userAvailable) {
        res.status(400);
        throw new Error("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed Password:", hashedPassword);

    const user = await User.create({
        username,
        email,
        password: hashedPassword
    })

    console.log("User created successfully:", user);

    if(user) {
        res.status(201).json({ _id: user.id, email: user.email });
    } else {
        res.status(400);
        throw new Error("User data is not valid");
    }
});



// @desc Login user
// @route POST /api/users/login
// @access Public

const loginUser = asyncHandler( async (req,res) => {

    const {email, password} = req.body; // Destructure email and password from request body

    console.log('Login attempt for:', email);

    if(!email || !password) {
        res.status(400);
        throw new Error("Please fill all the fields");
    }

    const user = await User.findOne({email}); // Find user by email
    console.log('User found:', !!user);

    if(user && (await bcrypt.compare(password, user.password))) {
        
        const accessToken = jwt.sign({
            user: {
                username: user.username,
                email: user.email,
                id: user.id
            },
        }, process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: "15m"}
        );
        
        res.status(200).json({accessToken})
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
    try {
        const users = await User.find({}, '-password'); // Exclude password field
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
    }
});

module.exports = { registerUser, loginUser, currentUser, fetchUsers };