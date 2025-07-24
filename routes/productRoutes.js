const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  filterProducts,
  getFilters,
  getPriceDetails,
  searchProducts,
  toggleWishlist,
  getWishlistProducts
} = require('../controllers/productController');

const router = express.Router();

// Search products by query (name, description, brand, category, or subcategory)
router.get('/search', searchProducts);

// Get all products with optional query filters (category, subCategory, brand, search)
router.get('/', getProducts);

// Get available filters (categories, subCategories, brands, filter values)
router.get('/filters', getFilters);

// Filter products by category, subCategory, brand, and specific filter values
router.get('/filter', filterProducts);

// Get wishlist products
router.get('/wishlist', protect, getWishlistProducts);

// Get a single product by ID
router.get('/:id', getProductById);

// Get detailed price breakdown for a product with specific filter selections
router.get('/:id/price-details', getPriceDetails);

// Create a new product (admin only)
router.post('/', protect, admin, createProduct);

// Update a product (admin only)
router.put('/:id', protect, admin, updateProduct);

// Toggle wishlist status for a product
router.put('/:id/wishlist', protect, toggleWishlist);

// Delete a product (admin only)
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;