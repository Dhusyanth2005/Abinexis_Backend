const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { addToWishlist, removeFromWishlist, getWishlist } = require('../controllers/wishlistController');

const router = express.Router();

// Add product to wishlist
router.post('/:productId', protect, addToWishlist);

// Remove product from wishlist
router.delete('/:productId', protect, removeFromWishlist);

// Get user's wishlist
router.get('/', protect, getWishlist);

module.exports = router;