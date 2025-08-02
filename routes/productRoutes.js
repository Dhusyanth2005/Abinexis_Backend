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
  getProductCount,
} = require('../controllers/productController');

const router = express.Router();

// Specific routes before dynamic routes
router.get('/search', searchProducts);
router.get('/filters', getFilters);
router.get('/filter', filterProducts);
router.get('/product-count', protect, admin, getProductCount); // Explicit route
router.get('/', getProducts);

// Dynamic routes (after specific routes)
router.get('/:id/price-details', getPriceDetails);
router.get('/:id', getProductById);
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;