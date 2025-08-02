const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler'); // Assuming you have this installed

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token received:', token); // Debug log
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded); // Debug log
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        console.log('User not found for ID:', decoded.id);
        return res.status(401).json({ message: 'User not found for this token' });
      }

      console.log('User authenticated:', req.user._id);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      res.status(401).json({ message: 'Not authorized, token invalid or expired', error: error.message });
    }
  } else {
    console.log('No token provided in headers');
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    console.log('Admin access granted for user:', req.user._id); // Debug log
    next();
  } else {
    console.log('Admin access denied for user:', req.user ? req.user._id : 'No user');
    res.status(403).json({ message: 'Not authorized as admin' }); // Changed to 403 for clarity
  }
};

module.exports = { protect, admin };