const express = require('express');
const router = express.Router();
const { registerUser, loginUser, currentUser, fetchUsers } = require('../controllers/userController');
const validateToken = require('../middleware/validateTokenHandler');

router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.post('/auth/current', validateToken, currentUser);
router.get('/users', validateToken, fetchUsers);

module.exports = router;