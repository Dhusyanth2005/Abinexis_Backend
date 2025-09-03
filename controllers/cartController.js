const Cart = require('../models/Cart');
const Product = require('../models/Product');
const axios = require('axios');
// https://abinexis-backend.vercel.app
const API_URL = 'https://abinexis-backend.onrender.com';

const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
};

const addToCart = async (req, res) => {
  const { productId, quantity, filters } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({ message: 'Product not found' });
    }

    // Check stock availability
    if (product.countInStock < quantity) {
      return res.status(400).json({ message: 'Product out of stock' });
    }

    // Fetch price details from price-details endpoint
    const priceResponse = await axios.get(
      `${API_URL}/api/products/${productId}/price-details`,
      {
        params: { selectedFilters: JSON.stringify(filters) },
        headers: {
          Authorization: req.headers.authorization, // Pass the user's token
        },
      }
    );

    const { effectivePrice, priceBreakdown ,normalPrice} = priceResponse.data;
    const price = normalPrice; // Use normalPrice if available, otherwise use effectivePrice
    const discountPrice = Object.values(priceBreakdown).some(
      breakdown => breakdown.isDiscounted
    )
      ? effectivePrice
      : 0;

    // Validate filters
    if (filters && product.filters) {
      for (const [filterName, filterValue] of Object.entries(filters)) {
        const filter = product.filters.find(
          f => f.name === filterName && f.values.includes(filterValue)
        );
        if (!filter) {
          return res.status(400).json({ message: `Invalid filter value: ${filterName} = ${filterValue} `});
        }
      }
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Check if item with same product and filters exists
    const itemIndex = cart.items.findIndex(
      item =>
        item.product.toString() === productId &&
        JSON.stringify(item.filters) === JSON.stringify(filters)
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, filters, price, discountPrice });
    }

    await cart.save();
    res.json(await Cart.findById(cart._id).populate('items.product'));
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Error adding to cart', error: error.message });
  }
};

const removeFromCart = async (req, res) => {
  const { productId, filters } = req.body;
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = cart.items.filter(
        item =>
          !(
            item.product.toString() === productId &&
            JSON.stringify(item.filters) === JSON.stringify(filters)
          )
      );
      await cart.save();
      res.json(await Cart.findById(cart._id).populate('items.product'));
    } else {
      res.status(404).json({ message: 'Cart not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error removing from cart', error: error.message });
  }
};

module.exports = { getCart, addToCart, removeFromCart };