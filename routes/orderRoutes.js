const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders, getOrderDetails, getKey, processPayment, paymentVerification, updateOrderStatus } = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming auth middleware exists

// Razorpay endpoints
router.get('/v1/getKey', protect, getKey);
router.post('/v1/payment/process', protect, processPayment);
router.post('/v1/paymentVerification', paymentVerification);

// Order endpoints
router.post('/', protect, createOrder);
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderDetails);
router.put('/:id', protect, admin, updateOrderStatus); // Admin route to update order status

module.exports = router;