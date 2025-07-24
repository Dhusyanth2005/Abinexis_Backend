const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, default: 1 },
      filters: { type: Map, of: String, default: {} }, // Store selected filters (e.g., { color: "Blue", size: "L" })
      price: { type: Number, default: 0 }, // Store the effective price based on filters
      discountPrice: { type: Number, default: 0 }, // Store the effective discount price based on filters
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);