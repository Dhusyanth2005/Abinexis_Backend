const Review = require('../models/Review');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');

const createReview = async (req, res) => {
  const { productId, rating, comment } = req.body;
  try {
    const images = [];
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'reviews' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          ).end(file.data);
        });
      });
      const uploadedImages = await Promise.all(uploadPromises);
      images.push(...uploadedImages);
    }
    const review = await Review.create({
      product: productId,
      user: req.user._id,
      rating,
      comment,
      images,
    });
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    product.numReviews += 1;
    product.rating = ((product.rating * (product.numReviews - 1)) + rating) / product.numReviews;
    await product.save();

    // Populate the user field before sending the response
    const populatedReview = await Review.findById(review._id).populate('user', 'firstName lastName _id');
    res.status(201).json(populatedReview);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Error creating review', error: error.message });
  }
};

// In reviewController.js
const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.id })
      .populate('user', 'firstName lastName _id') // Updated to include firstName and lastName
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateReview = async (req, res) => {
  const { rating, comment } = req.body;
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this review' });
    }

    const images = [...review.images];
    if (req.files && req.files.images) {
      if (images.length > 0) {
        const publicIds = images.map(url => url.split('/').pop().split('.')[0]);
        await Promise.all(
          publicIds.map(id =>
            cloudinary.uploader.destroy(`reviews/${id}`).catch(err => {
              console.error(`Failed to delete Cloudinary image ${id}:`, err);
            })
          )
        );
      }

      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'reviews' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          ).end(file.data);
        });
      });
      const uploadedImages = await Promise.all(uploadPromises);
      images.length = 0;
      images.push(...uploadedImages);
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    review.images = images;
    await review.save();

    const product = await Product.findById(review.product);
    if (!product) {
      throw new Error('Product not found');
    }
    const reviews = await Review.find({ product: review.product });
    product.rating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    await product.save();

    // Populate the user field before sending the response
    const populatedReview = await Review.findById(review._id).populate('user', 'firstName lastName _id');
    res.json(populatedReview);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Error updating review', error: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    console.log(`Attempting to delete review with ID: ${req.params.reviewId}`);
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      console.log('Review not found');
      return res.status(404).json({ message: 'Review not found' });
    }
    console.log(`Review found: ${review._id}, user: ${review.user}`);
    console.log(`Request user: ${req.user._id}`);
    if (review.user.toString() !== req.user._id.toString()) {
      console.log('User not authorized to delete this review');
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    // Delete images from Cloudinary (non-critical, continue on failure)
    if (review.images && review.images.length > 0) {
      console.log('Deleting Cloudinary images:', review.images);
      const publicIds = review.images.map(url => {
        const parts = url.split('/');
        const fileName = parts[parts.length - 1].split('.')[0];
        return `reviews/${fileName}`;
      });
      await Promise.all(
        publicIds.map(id =>
          cloudinary.uploader.destroy(id).catch(err => {
            console.error(`Failed to delete Cloudinary image ${id}:`, err);
          })
        )
      );
    }

    // Delete the review
    console.log('Deleting review from database');
    const deleteResult = await Review.deleteOne({ _id: req.params.reviewId });
    if (deleteResult.deletedCount === 0) {
      console.log('Review deletion failed: no documents deleted');
      throw new Error('Failed to delete review from database');
    }

    // Update product stats
    console.log(`Updating product stats for product: ${review.product}`);
    const product = await Product.findById(review.product);
    if (!product) {
      console.log('Product not found');
      throw new Error('Product not found');
    }
    product.numReviews = Math.max(0, product.numReviews - 1);
    if (product.numReviews > 0) {
      const reviews = await Review.find({ product: review.product });
      product.rating = reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0;
    } else {
      product.rating = 0;
    }
    await product.save();
    console.log('Product stats updated:', product);

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
};

module.exports = { createReview, getProductReviews, updateReview, deleteReview };