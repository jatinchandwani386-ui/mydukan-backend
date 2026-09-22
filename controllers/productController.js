const Product = require("../models/Product");

/**
 * GET /api/products
 * Public listing. Supports:
 *   ?page=1&limit=20
 *   ?category=<categoryId>
 *   ?minPrice=100&maxPrice=5000
 *   ?minRating=4
 *   ?q=search+text
 *   ?sort=price_asc | price_desc | rating | newest (default)
 * Only ever returns published, non-hidden products to the public.
 */
async function getProducts(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = { isHidden: false, status: "published" };

    if (req.query.category) filter.category = req.query.category;
    if (req.query.subcategory) filter.subcategory = req.query.subcategory;

    if (req.query.minPrice || req.query.maxPrice) {
      filter["price.current"] = {};
      if (req.query.minPrice) filter["price.current"].$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter["price.current"].$lte = Number(req.query.maxPrice);
    }

    if (req.query.minRating) {
      filter.rating = { $gte: Number(req.query.minRating) };
    }

    if (req.query.q) {
      filter.$text = { $search: req.query.q };
    }

    const sortMap = {
      price_asc: { "price.current": 1 },
      price_desc: { "price.current": -1 },
      rating: { rating: -1 },
      newest: { createdAt: -1 },
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/products/:slug — public single-product view */
async function getProductBySlug(req, res, next) {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isHidden: false,
      status: "published",
    })
      .populate("category", "name slug")
      .populate("subcategory", "name slug");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// Admin-only operations below (mounted behind `protect` middleware)
// ------------------------------------------------------------------

/** GET /api/admin/products — admin listing, includes hidden/draft items */
async function adminListProducts(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) filter.$text = { $search: req.query.q };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/products — manual create */
async function createProduct(req, res, next) {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/products/:id — manual update (also used for feature/hide toggles) */
async function updateProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    Object.assign(product, req.body);
    await product.save(); // triggers pre-save hook: slug/discount/buyUrl stay in sync

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/products/:id — hard delete */
async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/products/:id/feature — toggle featured flag */
async function toggleFeature(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    product.isFeatured = !product.isFeatured;
    await product.save();
    res.json({ success: true, data: { isFeatured: product.isFeatured } });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/products/:id/hide — toggle visibility */
async function toggleHide(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    product.isHidden = !product.isHidden;
    await product.save();
    res.json({ success: true, data: { isHidden: product.isHidden } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductBySlug,
  adminListProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeature,
  toggleHide,
};
