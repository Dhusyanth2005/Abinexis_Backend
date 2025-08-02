const Wishlist = require('../models/Wishlist');

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const existingWishlistItem = await Wishlist.findOne({ user: userId, product: productId });
    if (existingWishlistItem) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    const wishlistItem = await Wishlist.create({ user: userId, product: productId });
    res.status(201).json(wishlistItem);
  } catch (error) {
    res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const wishlistItem = await Wishlist.findOneAndDelete({ user: userId, product: productId });
    if (!wishlistItem) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }
    res.json({ message: 'Product removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from wishlist', error: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const wishlistItems = await Wishlist.find({ user: userId }).populate('product').lean();
    res.json(wishlistItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wishlist', error: error.message });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist
};