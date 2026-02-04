const express = require('express');
const router = express.Router();
const { registerUser, loginUser, currentUser, fetchUsers, getUserById, updateProfile, logoutUser } = require('../controllers/userController');
const validateToken = require('../middleware/validateTokenHandler');
const upload = require('../config/multer');

router.post('/auth/register', upload.single('profilePhoto'), registerUser);
router.post('/auth/login', loginUser);
router.post('/auth/logout', validateToken, logoutUser);
router.post('/auth/current', validateToken, currentUser);
router.get('/users', validateToken, fetchUsers);
router.get('/users/:userId', validateToken, getUserById);
router.put('/users/profile/update', validateToken, upload.single('profilePhoto'), updateProfile);

module.exports = router;