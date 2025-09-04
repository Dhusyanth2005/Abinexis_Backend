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
    
const sendOTP = async (email, otp, userName = 'User') => {
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                padding: 20px;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #52B69A 0%, #34A0A4 50%, #168AAD 100%);
                padding: 40px 30px;
                text-align: center;
                position: relative;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><radialGradient id="a" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="white" stop-opacity="0.1"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="100" height="20" fill="url(%23a)"/></svg>');
                opacity: 0.3;
            }
            
            .logo {
                width: 80px;
                height: 80px;
                background: url('https://res.cloudinary.com/dxosnlbx8/image/upload/v1756961824/abinexis_fernwt.jpg') no-repeat center/cover;
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
                position: relative;
                z-index: 1;
            }
            
            .logo svg {
                width: 40px;
                height: 40px;
                fill: white;
            }
            
            .header h1 {
                color: white;
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }
            
            .header p {
                color: rgba(255,255,255,0.9);
                font-size: 16px;
                position: relative;
                z-index: 1;
            }
            
            .content {
                padding: 50px 30px;
                text-align: center;
            }
            
            .greeting {
                font-size: 24px;
                color: #333;
                margin-bottom: 20px;
                font-weight: 600;
            }
            
            .message {
                font-size: 16px;
                color: #666;
                line-height: 1.6;
                margin-bottom: 40px;
            }
            
            .otp-container {
                background: linear-gradient(135deg, #f8f9ff 0%, #e8f4f8 100%);
                border: 2px dashed #52B69A;
                border-radius: 15px;
                padding: 30px;
                margin: 30px 0;
                position: relative;
            }
            
            .otp-label {
                font-size: 14px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
                font-weight: 600;
            }
            
            .otp-code {
                font-size: 36px;
                font-weight: 800;
                color: #168AAD;
                letter-spacing: 8px;
                margin: 15px 0;
                text-shadow: 0 2px 4px rgba(22, 138, 173, 0.2);
            }
            
            .timer {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                color: #e74c3c;
                font-size: 14px;
                font-weight: 600;
                margin-top: 20px;
            }
            
            .timer svg {
                width: 16px;
                height: 16px;
                fill: #e74c3c;
            }
            
            .security-note {
                background: rgba(255, 193, 7, 0.1);
                border-left: 4px solid #ffc107;
                padding: 20px;
                margin: 30px 0;
                border-radius: 0 10px 10px 0;
            }
            
            .security-note h3 {
                color: #856404;
                font-size: 16px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .security-note p {
                color: #856404;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }
            
            .footer p {
                color: #666;
                font-size: 14px;
                line-height: 1.6;
            }
            
            @media (max-width: 600px) {
                .email-container {
                    margin: 10px;
                    border-radius: 15px;
                }
                
                .header {
                    padding: 30px 20px;
                }
                
                .content {
                    padding: 30px 20px;
                }
                
                .otp-code {
                    font-size: 28px;
                    letter-spacing: 4px;
                }
                
                .greeting {
                    font-size: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="logo">
                    
                </div>
                <h1>Email Verification</h1>
                <p>Secure your account with our verification system</p>
            </div>
            
            <div class="content">
                <div class="greeting">Hello ${userName}! 👋</div>
                
                <p class="message">
                    We're excited to have you on board! To complete your registration and secure your account, 
                    please verify your email address using the OTP code below.
                </p>
                
                <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">${otp}</div>
                    <div class="timer">
                        <svg viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12,6 12,12 16,14"/>
                        </svg>
                        Valid for 10 minutes only
                    </div>
                </div>
                
                <div class="security-note">
                    <h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#856404">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        Security Notice
                    </h3>
                    <p>
                        For your security, never share this code with anyone. Our team will never ask for your OTP. 
                        If you didn't request this verification, please ignore this email.
                    </p>
                </div>
                
                <p class="message">
                    If you have any questions or need assistance, don't hesitate to contact our support team.
                </p>
            </div>
            
            <div class="footer">
                <p>
                    This email was sent to ${email}. If you didn't create an account, you can safely ignore this email.
                    <br><br>
                    © 2025 Abinexis. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"🛒Abinexis" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Verify Your Email - OTP Inside',
    html: htmlTemplate,
    text: `Hello ${userName}!\n\nYour OTP for registration is: ${otp}\n\nThis code is valid for 10 minutes only.\n\nFor security reasons, never share this code with anyone.\n\nIf you didn't request this verification, please ignore this email.\n\nThanks!`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
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
  await sendOTP(email, otp,firstName);
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
  callbackURL: 'https://abinexis-backend.onrender.com/api/auth/google/callback',
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
const getUserCount = async (req, res) => {
  try {
    // Verify if the requester is an admin
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ message: 'Only admins can access user count' });
    }

    const totalUsers = await User.countDocuments();
    res.json({ totalUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching user count' });
  }
};
module.exports = { register, login, updateUser, setAdmin, verifyOTP,getUser,changePassword, getUserCount };