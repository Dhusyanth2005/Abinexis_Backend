const Product = require('../models/Product');
const mongoose = require('mongoose');

const getProducts = async (req, res) => {
  const { category, subCategory, brand, search } = req.query;
  const query = {};
  if (category) query.category = { $regex: category, $options: 'i' };
  if (subCategory) query.subCategory = { $regex: subCategory, $options: 'i' };
  if (brand) query.brand = { $regex: brand, $options: 'i' };
  if (search) query.$text = { $search: search };

  try {
    const products = await Product.find(query).lean();
    const productsWithPrice = products.map(product => ({
      ...product,
      effectivePrice: product.effectivePrice ? product.effectivePrice({}) : 0
    }));
    res.json(productsWithPrice);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    const product = await Product.findById(id).populate('createdBy', 'name email').lean();
    if (product) {
      product.effectivePrice = product.effectivePrice ? product.effectivePrice({}) : 0;
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

const createProduct = async (req, res) => {
  const { name, description, shippingCost, brand, category, subCategory, filters, features, countInStock } = req.body;
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can create products' });
    }
    if (!name || !description || !category || !subCategory || shippingCost === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const images = [];
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'products' },
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
    const productData = {
      name,
      description,
      shippingCost: Number(shippingCost) || 0,
      brand,
      category,
      subCategory,
      filters: filters ? JSON.parse(filters) : [],
      features: features ? JSON.parse(features) : [],
      images,
      countInStock: Number(countInStock) || 0,
      createdBy: req.user.id,
    };
    const product = await Product.create(productData);
    const productWithPrice = {
      ...product.toObject(),
      effectivePrice: product.effectivePrice ? product.effectivePrice({}) : 0
    };
    res.status(201).json(productWithPrice);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can update products' });
    }
    const { name, description, shippingCost, brand, category, subCategory, filters, features, countInStock } = req.body;
    product.name = name || product.name;
    product.description = description || product.description;
    product.shippingCost = shippingCost !== undefined ? Number(shippingCost) : product.shippingCost;
    product.brand = brand !== undefined ? brand : product.brand;
    product.category = category || product.category;
    product.subCategory = subCategory || product.subCategory;
    product.filters = filters ? JSON.parse(filters) : product.filters;
    product.features = features ? JSON.parse(features) : product.features;
    product.countInStock = countInStock !== undefined ? Number(countInStock) : product.countInStock;

    if (req.files && req.files.images) {
      const images = [];
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'products' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          ).end(file.data);
        });
      });
      const uploadedImages = await Promise.all(uploadPromises);
      product.images = uploadedImages;
    }
    await product.save();
    const productWithPrice = {
      ...product.toObject(),
      effectivePrice: product.effectivePrice ? product.effectivePrice({}) : 0
    };
    res.json(productWithPrice);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admins can delete products' });
    }
    await Product.findByIdAndDelete(id);
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
};

const filterProducts = async (req, res) => {
  const { category, subCategory, brand, filters, selectedFilters } = req.query;
  const query = {};
  if (category) query.category = { $regex: category, $options: 'i' };
  if (subCategory) query.subCategory = { $regex: subCategory, $options: 'i' };
  if (brand) query.brand = { $regex: brand, $options: 'i' };
  let parsedSelectedFilters = {};
  if (filters) {
    try {
      const parsedFilters = JSON.parse(filters);
      Object.keys(parsedFilters).forEach(filterName => {
        query[filters.name] = filterName;
        query[filters.values] = { $in: parsedFilters[filterName] };
      });
    } catch (error) {
      return res.status(400).json({ message: 'Invalid filters format' });
    }
  }
  if (selectedFilters) {
    try {
      parsedSelectedFilters = JSON.parse(selectedFilters);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid selectedFilters format' });
    }
  }
  try {
    const products = await Product.find(query).lean();
    if (products.length > 0) {
      const productsWithPrice = products.map(product => ({
        ...product,
        effectivePrice: product.effectivePrice ? product.effectivePrice(parsedSelectedFilters) : 0
      }));
      res.json(productsWithPrice);
    } else {
      res.status(404).json({ message: 'No products found for the given filters' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error filtering products', error: error.message });
  }
};

const getFilters = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    const subCategories = await Product.find({ subCategory: { $exists: true, $ne: null } })
      .select('category subCategory')
      .lean();
    const brands = await Product.find({ brand: { $exists: true, $ne: null } })
      .select('category brand')
      .lean();
    const filters = await Product.aggregate([
      { $unwind: '$filters' },
      {
        $group: {
          _id: { category: '$category', name: '$filters.name' },
          values: { $addToSet: '$filters.values' }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          name: '$_id.name',
          values: {
            $reduce: {
              input: '$values',
              initialValue: [],
              in: { $setUnion: ['$$this', '$$value'] }
            }
          }
        }
      }
    ]);
    res.json({
      categories,
      subCategories: subCategories.map(({ category, subCategory }) => ({ category, subCategory })),
      brands: brands.map(({ category, brand }) => ({ category, brand })),
      filters
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching filters', error: error.message });
  }
};

const getPriceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedFilters } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    let parsedSelectedFilters = {};
    if (selectedFilters) {
      try {
        parsedSelectedFilters = JSON.parse(selectedFilters);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid selectedFilters format' });
      }
    }
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const priceBreakdown = {};
    let effectivePrice = 0;
    let normalPrice = 0;
    product.filters.forEach(filter => {
      const selectedValue = parsedSelectedFilters[filter.name];
      if (selectedValue) {
        const adjustment = filter.priceAdjustments.find(adj => adj.value === selectedValue);
        if (adjustment) {
          const price = adjustment.price || 0;
          const discountedPrice = adjustment.discountPrice > 0 ? adjustment.discountPrice : price;
          priceBreakdown[filter.name] = {
            value: selectedValue,
            normalPrice: price,
            effectivePrice: discountedPrice,
            isDiscounted: adjustment.discountPrice > 0
          };
          effectivePrice += discountedPrice;
          normalPrice += price;
        } else {
          priceBreakdown[filter.name] = {
            value: selectedValue,
            normalPrice: 0,
            effectivePrice: 0,
            isDiscounted: false,
            error: 'Selected value not found in price adjustments'
          };
        }
      } else {
        priceBreakdown[filter.name] = {
          value: null,
          normalPrice: 0,
          effectivePrice: 0,
          isDiscounted: false,
          error: 'No value selected for this filter'
        };
      }
    });
    res.json({
      productId: product._id,
      productName: product.name,
      priceBreakdown,
      effectivePrice,
      normalPrice,
      shippingCost: product.shippingCost,
      totalCost: effectivePrice + product.shippingCost
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching price details', error: error.message });
  }
};

const searchProducts = async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    // Search products by name, description, brand, category, or subCategory
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { subCategory: { $regex: query, $options: 'i' } },
      ]
    })
    .select('_id name category brand subCategory')
    .limit(5)
    .lean();

    if (products.length > 0) {
      const suggestions = products.map(product => ({
        _id: product._id,
        name: product.name,
        category: product.category,
        display: `${product.name} (${product.category})`
      }));
      return res.json({ suggestions });
    }

    res.json({ message: 'No matching products found' });
  } catch (error) {
    res.status(500).json({ message: 'Error searching products', error: error.message });
  }
};
const toggleWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const { isWishlist } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isWishlist = isWishlist !== undefined ? isWishlist : !product.isWishlist;
    await product.save();

    const productWithPrice = {
      ...product.toObject(),
      effectivePrice: product.effectivePrice ? product.effectivePrice({}) : 0
    };
    res.json(productWithPrice);
  } catch (error) {
    res.status(500).json({ message: 'Error updating wishlist status', error: error.message });
  }
};

const getWishlistProducts = async (req, res) => {
  try {
    const products = await Product.find({ isWishlist: true }).lean();
    const productsWithPrice = products.map(product => ({
      ...product,
      effectivePrice: product.effectivePrice ? product.effectivePrice({}) : 0
    }));
    if (products.length > 0) {
      res.json(productsWithPrice);
    } else {
      res.status(404).json({ message: 'No wishlist products found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wishlist products', error: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  filterProducts,
  getFilters,
  getPriceDetails,
  searchProducts,
  toggleWishlist,
  getWishlistProducts
};