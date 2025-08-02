const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { register, login, updateUser, setAdmin, verifyOTP,getUser,changePassword,getUserCount} = require('../controllers/authController');
const passport = require('passport');

const router = express.Router();

// OTP-based registration routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);

// Password-based login
router.post('/login', login);
router.post('/change-password', protect, changePassword);
// Update user profile
router.put('/update', protect, updateUser);
router.get('/update', protect, getUser);
// Admin route
router.post('/set-admin', protect, admin, setAdmin);
router.get('/user-count', protect, getUserCount);
// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  if (!req.user.user) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth?msg=${encodeURIComponent(req.user.msg)}`);
  }
  const token = req.user.token;
  res.redirect(`${process.env.FRONTEND_URL}/auth?token=${token}`);
});

module.exports = router;