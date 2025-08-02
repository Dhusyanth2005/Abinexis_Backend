const Homepage = require('../models/HomePage');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

// Get homepage configuration
const getHomepage = async (req, res) => {
  try {
    const homepage = await Homepage.findOne()
      .populate('banners.searchProduct')
      .populate('featuredProducts')
      .populate('todayOffers')
      .lean();
    
    if (!homepage) {
      return res.status(404).json({ message: 'Homepage configuration not found' });
    }
    
    res.json(homepage);
  } catch (error) {
    console.error('Error fetching homepage:', error);
    res.status(500).json({ message: 'Error fetching homepage configuration', error: error.message });
  }
};

// Create or update homepage configuration
// In updateHomepage
const updateHomepage = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can update homepage configuration' });
    }

    const { banners, featuredProducts, todayOffers } = req.body;

    // Validate input
    if (!banners || !Array.isArray(banners) || !featuredProducts || !Array.isArray(featuredProducts) || !todayOffers || !Array.isArray(todayOffers)) {
      return res.status(400).json({ message: 'Invalid input data' });
    }

    // Validate ObjectIds
    const validateObjectIds = (ids) => ids.every(id => mongoose.Types.ObjectId.isValid(id));
    
    if (!validateObjectIds(featuredProducts) || !validateObjectIds(todayOffers)) {
      return res.status(400).json({ message: 'Invalid product IDs' });
    }

    // Validate banner data
    for (const banner of banners) {
      if (!banner.title || !banner.image) {
        return res.status(400).json({ message: 'Banner title and image are required' });
      }
      if (banner.searchProduct && !mongoose.Types.ObjectId.isValid(banner.searchProduct)) {
        return res.status(400).json({ message: 'Invalid search product ID' });
      }
      if (banner.description && banner.description.length > 200) {
        return res.status(400).json({ message: 'Banner description cannot exceed 200 characters' });
      }
    }

    // Verify products exist
    const productIds = [...new Set([...featuredProducts, ...todayOffers])];
    const existingProducts = await Product.find({ _id: { $in: productIds } }).select('_id');
    if (existingProducts.length !== productIds.length) {
      return res.status(400).json({ message: 'One or more products do not exist' });
    }

    // Handle banner image uploads
    const processedBanners = await Promise.all(banners.map(async (banner) => {
      let imageUrl = banner.image;
      
      // Check if image is a new upload (base64 or file)
      if (banner.image && banner.image.startsWith('data:image/')) {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'homepage_banners' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(Buffer.from(banner.image.split(',')[1], 'base64'));
        });
        imageUrl = uploadResult.secure_url;
      }

      return {
        ...banner,
        image: imageUrl,
        description: banner.description || '', // Include description, default to empty string
        searchProduct: banner.searchProduct || null
      };
    }));

    // Update or create homepage
    const homepage = await Homepage.findOneAndUpdate(
      {},
      {
        banners: processedBanners,
        featuredProducts,
        todayOffers,
        updatedAt: Date.now()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('banners.searchProduct')
      .populate('featuredProducts')
      .populate('todayOffers');

    res.json(homepage);
  } catch (error) {
    console.error('Error updating homepage:', error);
    res.status(500).json({ message: 'Error updating homepage configuration', error: error.message });
  }
};

// Add a new banner
// In addBanner
const addBanner = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can add banners' });
    }

    const { title, description, searchProduct } = req.body;
    let imageUrl = req.body.image;

    if (!title) {
      return res.status(400).json({ message: 'Banner title is required' });
    }

    if (description && description.length > 200) {
      return res.status(400).json({ message: 'Banner description cannot exceed 200 characters' });
    }

    // Handle image upload
    if (req.files && req.files.image) {
      const file = req.files.image;
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'homepage_banners' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.data);
      });
      imageUrl = uploadResult.secure_url;
    } else if (imageUrl && imageUrl.startsWith('data:image/')) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'homepage_banners' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(Buffer.from(imageUrl.split(',')[1], 'base64'));
      });
      imageUrl = uploadResult.secure_url;
    }

    if (!imageUrl) {
      return res.status(400).json({ message: 'Banner image is required' });
    }

    if (searchProduct && !mongoose.Types.ObjectId.isValid(searchProduct)) {
      return res.status(400).json({ message: 'Invalid search product ID' });
    }

    const homepage = await Homepage.findOne();
    if (!homepage) {
      // Create new homepage if none exists
      const newHomepage = await Homepage.create({
        banners: [{
          title,
          description: description || '', // Include description
          image: imageUrl,
          searchProduct: searchProduct || null
        }],
        featuredProducts: [],
        todayOffers: []
      });
      return res.status(201).json(await newHomepage.populate('banners.searchProduct'));
    }

    homepage.banners.push({
      title,
      description: description || '', // Include description
      image: imageUrl,
      searchProduct: searchProduct || null
    });

    await homepage.save();
    res.status(201).json(await Homepage.findOne().populate('banners.searchProduct'));
  } catch (error) {
    console.error('Error adding banner:', error);
    res.status(500).json({ message: 'Error adding banner', error: error.message });
  }
};

// Update a banner
// In updateBanner
const updateBanner = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can update banners' });
    }

    const { bannerId } = req.params;
    const { title, description, searchProduct } = req.body;
    let imageUrl = req.body.image;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({ message: 'Invalid banner ID' });
    }

    if (!title) {
      return res.status(400).json({ message: 'Banner title is required' });
    }

    if (description && description.length > 200) {
      return res.status(400).json({ message: 'Banner description cannot exceed 200 characters' });
    }

    // Handle image upload
    if (req.files && req.files.image) {
      const file = req.files.image;
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'homepage_banners' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.data);
      });
      imageUrl = uploadResult.secure_url;
    } else if (imageUrl && imageUrl.startsWith('data:image/')) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'homepage_banners' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(Buffer.from(imageUrl.split(',')[1], 'base64'));
      });
      imageUrl = uploadResult.secure_url;
    }

    if (searchProduct && !mongoose.Types.ObjectId.isValid(searchProduct)) {
      return res.status(400).json({ message: 'Invalid search product ID' });
    }

    const homepage = await Homepage.findOne();
    if (!homepage) {
      return res.status(404).json({ message: 'Homepage configuration not found' });
    }

    const banner = homepage.banners.id(bannerId);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    banner.title = title;
    if (imageUrl) banner.image = imageUrl;
    banner.description = description || ''; // Update description
    banner.searchProduct = searchProduct || null;

    await homepage.save();
    res.json(await Homepage.findOne()
      .populate('banners.searchProduct')
      .populate('featuredProducts')
      .populate('todayOffers'));
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ message: 'Error updating banner', error: error.message });
  }
};

// Delete a banner
const deleteBanner = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can delete banners' });
    }

    const { bannerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return res.status(400).json({ message: 'Invalid banner ID' });
    }

    const homepage = await Homepage.findOne();
    if (!homepage) {
      return res.status(404).json({ message: 'Homepage configuration not found' });
    }

    const banner = homepage.banners.id(bannerId);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    if (homepage.banners.length <= 1) {
      return res.status(400).json({ message: 'At least one banner is required' });
    }

    homepage.banners.pull(bannerId);
    await homepage.save();
    res.json({ message: 'Banner deleted successfully', homepage: await Homepage.findOne().populate('banners.searchProduct') });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ message: 'Error deleting banner', error: error.message });
  }
};

// Add or remove featured product
const manageFeaturedProduct = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can manage featured products' });
    }

    const { productId, action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use "add" or "remove"' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let homepage = await Homepage.findOne();
    if (!homepage) {
      homepage = await Homepage.create({ banners: [], featuredProducts: [], todayOffers: [] });
    }

    if (action === 'add') {
      if (!homepage.featuredProducts.includes(productId)) {
        homepage.featuredProducts.push(productId);
      }
    } else {
      homepage.featuredProducts = homepage.featuredProducts.filter(id => id.toString() !== productId);
    }

    await homepage.save();
    res.json(await Homepage.findOne()
      .populate('banners.searchProduct')
      .populate('featuredProducts')
      .populate('todayOffers'));
  } catch (error) {
    console.error('Error managing featured product:', error);
    res.status(500).json({ message: 'Error managing featured product', error: error.message });
  }
};

// Add or remove today's offer
const manageTodayOffer = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can manage today\'s offers' });
    }

    const { productId, action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use "add" or "remove"' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let homepage = await Homepage.findOne();
    if (!homepage) {
      homepage = await Homepage.create({ banners: [], featuredProducts: [], todayOffers: [] });
    }

    if (action === 'add') {
      if (!homepage.todayOffers.includes(productId)) {
        homepage.todayOffers.push(productId);
      }
    } else {
      homepage.todayOffers = homepage.todayOffers.filter(id => id.toString() !== productId);
    }

    await homepage.save();
    res.json(await Homepage.findOne()
      .populate('banners.searchProduct')
      .populate('featuredProducts')
      .populate('todayOffers'));
  } catch (error) {
    console.error('Error managing today\'s offer:', error);
    res.status(500).json({ message: 'Error managing today\'s offer', error: error.message });
  }
};

module.exports = {
  getHomepage,
  updateHomepage,
  addBanner,
  updateBanner,
  deleteBanner,
  manageFeaturedProduct,
  manageTodayOffer
};