const Category = require("../models/Category");

/** GET /api/categories — public category tree (top-level with nested children) */
async function getCategoryTree(req, res, next) {
  try {
    const all = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();

    const byId = {};
    all.forEach((c) => (byId[c._id] = { ...c, children: [] }));

    const tree = [];
    all.forEach((c) => {
      if (c.parent) {
        byId[c.parent]?.children.push(byId[c._id]);
      } else {
        tree.push(byId[c._id]);
      }
    });

    res.json({ success: true, data: tree });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/categories — flat list, includes inactive, for the admin panel */
async function adminListCategories(req, res, next) {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    Object.assign(category, req.body);
    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    // Guard: don't orphan products or subcategories silently.
    const Product = require("../models/Product");
    const [childCount, productCount] = await Promise.all([
      Category.countDocuments({ parent: req.params.id }),
      Product.countDocuments({ category: req.params.id }),
    ]);

    if (childCount > 0 || productCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${productCount} product(s) and ${childCount} subcategory(ies) reference this category.`,
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategoryTree,
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
