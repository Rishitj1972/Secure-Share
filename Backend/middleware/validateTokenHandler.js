const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModels");

const validateToken = expressAsyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const tokenFromQuery = req.query && req.query.token;

  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (tokenFromQuery && req.method === 'GET' && req.path.startsWith('/download/')) {
    token = tokenFromQuery;
  }

  if (!token) {
    res.status(401);
    throw new Error('User is not authorized or token is missing');
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    // Check if token is the current valid token for this user
    const user = await User.findById(decoded.user.id);
    if (!user || user.currentToken !== token) {
      res.status(401);
      throw new Error('Token is no longer valid. Please login again');
    }
    
    // Check if token has expired
    if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
      user.currentToken = null;
      user.tokenExpiresAt = null;
      await user.save();
      res.status(401);
      throw new Error('Token has expired. Please login again');
    }
    
    req.user = decoded.user;
    next();
  } catch (err) {
    if (err.message.includes('Token is no longer valid') || err.message.includes('Token has expired')) {
      res.status(401);
      throw err;
    }
    res.status(401);
    throw new Error('User is not authorized');
  }
});

module.exports = validateToken;