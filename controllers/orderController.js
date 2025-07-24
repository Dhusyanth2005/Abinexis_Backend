const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Get Razorpay Key
exports.getKey = async (req, res) => {
  res.status(200).json({
    key: process.env.RAZORPAY_KEY_ID,
  });
};

// Process Razorpay Payment
exports.processPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const options = {
      amount: Number(amount * 100), // Amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1 // Auto-capture
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay order',
      error: error.message
    });
  }
};

// Create Order
exports.createOrder = async (req, res) => {
  try {
    const {
      personalInfo,
      orderItems,
      shippingInfo,
      paymentMethod,
      priceSummary,
      paymentInfo
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate and fetch product details, and check stock
    const updatedOrderItems = await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }
        // Check if sufficient stock is available
        if (product.countInStock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
        return {
          product: item.product,
          name: product.name,
          quantity: item.quantity,
          category: product.category,
          price: item.price || product.price,
          originalPrice: item.originalPrice || product.originalPrice || product.price,
          shippingCost: item.shippingCost || 0,
          image: product.images[0] || '',
          filters: item.filters || {}
        };
      })
    );

    // Reduce stock for each product
    await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findById(item.product);
        if (product) {
          product.countInStock -= item.quantity;
          await product.save();
        }
      })
    );

    // Create order in database
    const order = new Order({
      user: req.user._id,
      personalInfo,
      orderItems: updatedOrderItems,
      shippingInfo,
      paymentInfo: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : paymentInfo.status,
        razorpayOrderId: paymentInfo?.razorpayOrderId,
        razorpayPaymentId: paymentInfo?.razorpayPaymentId,
        razorpaySignature: paymentInfo?.razorpaySignature,
        paidAt: paymentMethod === 'razorpay' ? new Date() : null
      },
      priceSummary,
      isPaid: paymentMethod === 'razorpay',
      orderStatus: 'processing'
    });

    await order.save();

    res.status(201).json({
      message: 'Order created successfully',
      orderId: order._id
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message || 'Error creating order' });
  }
};

// Payment Verification
exports.paymentVerification = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay parameters'
      });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid signature'
      });
    }

    // Find the order and update stock
    const order = await Order.findOne({ 'paymentInfo.razorpayOrderId': razorpay_order_id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Stock is already reduced in createOrder for Razorpay after successful payment
    // Redirect to success page
    res.redirect(`http://localhost:5173/paymentSuccess?reference=${razorpay_payment_id}`);
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Get User Orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: error.message || 'Error fetching orders' });
  }
};

// Get Order Details
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || order.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: error.message || 'Error fetching order details' });
  }
};

// Admin: Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, isPaid } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
    }

    if (isPaid !== undefined) {
      order.isPaid = isPaid;
      if (isPaid && order.paymentInfo.method === 'cod') {
        order.paymentInfo.status = 'completed';
        order.paymentInfo.paidAt = new Date();
      }
    }

    await order.save();
    res.status(200).json({ message: 'Order updated successfully', order });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: error.message || 'Error updating order' });
  }
};