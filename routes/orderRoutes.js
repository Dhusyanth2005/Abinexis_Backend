const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders, getOrderDetails, getKey, processPayment, paymentVerification, updateOrderStatus,getAllOrders,getOrderCount,getRecentOrders,cancelOrder } = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming auth middleware exists

// Razorpay endpoints
router.get('/v1/getKey', protect, getKey);
router.post('/v1/payment/process', protect, processPayment);
router.post('/v1/paymentVerification', paymentVerification);
// Admin-only endpoints
router.get('/order-count', protect, admin, getOrderCount);
router.get('/recent-orders', protect, admin, getRecentOrders);

// Order endpoints
router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);
router.get('/admin', protect, admin, getAllOrders); // New admin route
router.get('/:id', protect, getOrderDetails);
router.put('/:id', protect, admin, updateOrderStatus); // Admin route to update order status
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;