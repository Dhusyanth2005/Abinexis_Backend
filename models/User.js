const mongoose = require('mongoose');


const addressSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['Home', 'Work', 'Other'] },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  phone: { type: String, required: true },
  isActive: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String }, // Optional
  email: { type: String, unique: true, required: true },
  phone: { type: String }, // Not required during registration
  password: { type: String }, // Not required for Google OAuth users
  googleId: { type: String }, // For Google OAuth users
  authMethod: { type: String, required: true, enum: ['password', 'google'], default: 'password' },
  isAdmin: { type: Boolean, default: false },
  addresses: [addressSchema] // Array of addresses
}, { timestamps: true });

// userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);