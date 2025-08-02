const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Banner title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Banner description cannot exceed 200 characters'],
    default: '' // Optional field with empty string as default
  },
  image: {
    type: String,
    required: [true, 'Banner image URL is required'],
    trim: true
  },
  searchProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const homepageSchema = new mongoose.Schema({
  banners: [bannerSchema],
  featuredProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  todayOffers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update `updatedAt` timestamp on save
homepageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware to update `updatedAt` timestamp on banner updates
bannerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Homepage', homepageSchema);