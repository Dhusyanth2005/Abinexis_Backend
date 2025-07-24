const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// In-memory OTP store (replace with MongoDB in production)
let otpStore = {};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email',
    text: `Your OTP for registration is ${otp}. It is valid for 10 minutes.`,
  };
  await transporter.sendMail(mailOptions);
};

// OTP-based registration
const register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !email || !password) {
    return res.status(400).json({ message: 'First name, email, and password are required' });
  }
  const userExists = await User.findOne({ email });
  if (userExists) {
    if (userExists.authMethod === 'google') {
      return res.status(400).json({ message: 'This email is registered with Google authentication. Please log in using Google.' });
    }
    return res.status(400).json({ message: 'User already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOTP();
  otpStore[email] = { otp, hashedPassword, firstName, lastName, expires: Date.now() + 10 * 60 * 1000 };
  await sendOTP(email, otp);
  res.status(200).json({ message: 'OTP sent to your email. Please verify.' });
};

// Verify OTP and create user
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const storedOTP = otpStore[email];

  if (!storedOTP || Date.now() > storedOTP.expires || storedOTP.otp !== otp) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  const user = await User.create({
    firstName: storedOTP.firstName,
    lastName: storedOTP.lastName,
    email,
    password: storedOTP.hashedPassword,
    authMethod: 'password',
    isAdmin: false,
  });
  delete otpStore[email]; // Clear OTP store
  if (user) {
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    res.status(201).json({ token });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// Password-based login
const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });
  if (user.authMethod === 'google') {
    return res.status(400).json({ message: 'This account is registered with Google authentication. Please log in using Google.' });
  }
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// Update user profile
const updateUser = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { firstName, lastName, email, phone, addresses } = req.body;

  // Validate email if provided
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    user.email = email;
  }

  // Update fields if provided
  if (firstName) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName; // Allow empty string or null
  if (phone) user.phone = phone;

  // Validate and update addresses
  if (addresses) {
    if (!Array.isArray(addresses)) {
      return res.status(400).json({ message: 'Addresses must be an array' });
    }
    for (const addr of addresses) {
      if (
        !addr.type ||
        !['Home', 'Work', 'Other'].includes(addr.type) ||
        !addr.address ||
        !addr.city ||
        !addr.state ||
        !addr.zipCode ||
        !addr.phone
      ) {
        return res.status(400).json({ message: 'Invalid address data' });
      }
    }
    // Ensure only one address is active
    const activeCount = addresses.filter(addr => addr.isActive === true).length;
    if (activeCount > 1) {
      return res.status(400).json({ message: 'Only one address can be active' });
    }
    user.addresses = addresses;
  }

  await user.save();
  res.json({ message: 'User updated successfully' });
};

// Set admin status
const setAdmin = async (req, res) => {
  const { userId } = req.body;
  const adminUser = await User.findById(req.user.id);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ message: 'Only admins can set admin status' });
  }
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  user.isAdmin = true;
  await user.save();
  res.json({ message: 'User set as admin successfully' });
};

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (user) {
      if (user.authMethod === 'password') {
        return done(null, { user: null, msg: 'This email is registered with password authentication. Please log in using the password method.' });
      }
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
    } else {
      user = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        firstName: profile.displayName.split(' ')[0] || 'User',
        lastName: profile.displayName.split(' ').slice(1).join(' ') || '',
        authMethod: 'google',
        isAdmin: false,
      });
      await user.save();
    }
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return done(null, { user, token });
  } catch (err) {
    return done(err, null);
  }
}));

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -googleId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      addresses: user.addresses,
      createdAt: user.createdAt,
      authMethod: user.authMethod || 'password',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching user data' });
  }
};
// Change user password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.authMethod !== 'password') {
    return res.status(400).json({ message: 'Password change is only available for password-based accounts' });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password changed successfully' });
};
module.exports = { register, login, updateUser, setAdmin, verifyOTP,getUser,changePassword};