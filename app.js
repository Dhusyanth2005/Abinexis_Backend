const express = require('express');
const dotenv = require('dotenv');
const { errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const homepageRoutes = require('./routes/homepageRoutes');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const passport = require('passport');

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000','https://admin-abinexis.vercel.app','https://abinexis.vercel.app','https://store.abinexis.com'],// Allow requests from your frontend
  credentials: true, // Allow cookies or authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow methods
}));
app.use(express.json());
app.use(fileUpload({ useTempFiles: false })); // Handle uploads in-memory
app.use(passport.initialize());

// Custom middleware to parse nested form-data fields (e.g., features[size])
app.use('/api/products', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const features = {};
    for (let key in req.body) {
      if (key.startsWith('features[') && key.endsWith(']')) {
        const featureKey = key.slice(9, -1); // Extract key between 'features[' and ']'
        features[featureKey] = req.body[key];
        delete req.body[key]; // Remove the nested field
      }
    }
    if (Object.keys(features).length > 0) {
      req.body.features = features;
    }
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/homepage', homepageRoutes);

// Serve static files
app.use(express.static('public'));

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;