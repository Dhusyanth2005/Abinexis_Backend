const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getHomepage,
  updateHomepage,
  addBanner,
  updateBanner,
  deleteBanner,
  manageFeaturedProduct,
  manageTodayOffer
} = require('../controllers/homepageController');

const router = express.Router();

// Get homepage configuration
router.get('/', getHomepage);

// Update entire homepage configuration (admin only)
router.put('/', protect, admin, updateHomepage);

// Add a new banner (admin only)
router.post('/banners', protect, admin, addBanner);

// Update a banner (admin only)
router.put('/banners/:bannerId', protect, admin, updateBanner);

// Delete a banner (admin only)
router.delete('/banners/:bannerId', protect, admin, deleteBanner);

// Manage featured products (add/remove) (admin only)
router.post('/featured', protect, admin, manageFeaturedProduct);

// Manage today's offers (add/remove) (admin only)
router.post('/offers', protect, admin, manageTodayOffer);

module.exports = router;