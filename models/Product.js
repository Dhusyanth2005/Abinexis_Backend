const mongoose = require('mongoose');

const filterSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "size", "color", "RAM"
  values: [{ type: String, required: true }], // e.g., ["S", "M", "L"] or ["256GB", "512GB"]
  priceAdjustments: [{
    value: { type: String, required: true }, // Specific filter value, e.g., "S" or "256GB"
    price: { type: Number, required: true }, // Adjusted price for this filter value
    discountPrice: { type: Number, default: 0 } // Optional discounted price
  }]
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  shippingCost: { type: Number, required: true, default: 0 }, // Shipping cost for the product
  brand: { type: String }, // Brand of the product, e.g., "Nike", "Samsung"
  category: {
    type: String,
    required: true,
    enum: [
      'Kitchen',
      'Health',
      'Fashion',
      'Beauty',
      'Electronics',
      'Fitness',
      'Spiritual',
      'Kids',
      'Pets',
      'Stationery'
    ]
  },
  subCategory: { type: String, required: true }, // e.g., "T-Shirts", "Mobile"
  filters: [filterSchema], // Dynamic filters like size, color, RAM, etc.
  features: [{ type: String }], // Array of feature descriptions added by admin
  images: [{ type: String }], // Cloudinary URLs
  countInStock: { type: Number, required: true, default: 0 },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to calculate effective price based on selected filter values
productSchema.virtual('effectivePrice').get(function(selectedFilters = {}) {
  let totalPrice = 0;
  this.filters.forEach(filter => {
    const selectedValue = selectedFilters[filter.name]; // e.g., selectedFilters = { size: "M", color: "Blue" }
    if (selectedValue) {
      const adjustment = filter.priceAdjustments.find(adj => adj.value === selectedValue);
      if (adjustment) {
        totalPrice += adjustment.discountPrice > 0 ? adjustment.discountPrice : adjustment.price || 0;
      }
    }
  });
  return totalPrice;
});

// Index for efficient searching
productSchema.index({ name: 'text', description: 'text', category: 1, subCategory: 1, brand: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;