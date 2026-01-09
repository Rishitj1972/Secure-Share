const express = require('express');

const router = express.Router();

const { registerUser, loginUser, currentUser, fetchUsers } = require('../controllers/userController');
const validateToken = require('../middleware/validateTokenHandler');

router.post('/auth/register', registerUser); // Route for user registration public routes

router.post('/auth/login', loginUser); // Route for user login public routes

router.post('/auth/current', validateToken, currentUser); // Route for getting current user information (protected route)

router.get('/users',validateToken,fetchUsers); // Route for fetching all users by admin

module.exports = router;