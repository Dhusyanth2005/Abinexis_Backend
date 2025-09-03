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
const serverless = require('serverless-http');

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000','https://admin-abinexis.vercel.app','https://abinexis.vercel.app','https://store.abinexis.com','https://abinexis-backend.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());
app.use(fileUpload({ useTempFiles: false }));
app.use(passport.initialize());

// Custom middleware for form-data parsing
app.use('/api/products', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const features = {};
    for (let key in req.body) {
      if (key.startsWith('features[') && key.endsWith(']')) {
        const featureKey = key.slice(9, -1);
        features[featureKey] = req.body[key];
        delete req.body[key];
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

// Static
app.use(express.static('public'));

// Error handler
app.use(errorHandler);

// Export serverless handler
module.exports = app;
module.exports.handler = serverless(app);
