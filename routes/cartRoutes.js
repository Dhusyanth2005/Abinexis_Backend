const express = require('express');
const { getCart, addToCart, removeFromCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, getCart);
router.post('/add', protect, addToCart);
router.delete('/remove', protect, removeFromCart);
router.delete('/clear', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
      res.status(200).json({ message: 'Cart cleared successfully' });
    } else {
      res.status(404).json({ message: 'Cart not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error clearing cart', error: error.message });
  }
});
module.exports = router;