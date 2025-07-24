//models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
  },
  orderItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    image: { type: String },
    filters: { type: Map, of: String }
  }],
  shippingInfo: {
    type: { type: String, required: true, enum: ['Home', 'Work', 'Other'] },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentInfo: {
    method: { 
      type: String, 
      required: true, 
      enum: ['razorpay', 'cod'] 
    },
    razorpayOrderId: { type: String }, // Razorpay order ID
    razorpayPaymentId: { type: String }, // Razorpay payment ID
    razorpaySignature: { type: String }, // Razorpay signature for verification
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'created', 'authorized', 'captured', 'refunded'],
      default: 'pending' 
    },
    paidAt: { type: Date }
  },
  priceSummary: {
    subtotal: { type: Number, required: true },
    savings: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  orderStatus: {
    type: String,
    enum: ['processing', 'shipped','out of delivery','delivered', 'cancelled'],
    default: 'processing'
  },
  isPaid: { type: Boolean, default: false },
  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);