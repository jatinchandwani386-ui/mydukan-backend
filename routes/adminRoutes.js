const express = require("express");
const { protect, authorize } = require("../middleware/auth");

const {
  adminListProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeature,
  toggleHide,
} = require("../controllers/productController");

const {
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const { lookupProduct } = require("../controllers/quickAddController");
const { getClickStats } = require("../controllers/redirectController");

const router = express.Router();

// Every route below requires a valid admin JWT
router.use(protect);
router.use(authorize("admin", "editor"));

// Products — manual CRUD + feature/hide toggles
router.get("/products", adminListProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", authorize("admin"), deleteProduct);
router.patch("/products/:id/feature", toggleFeature);
router.patch("/products/:id/hide", toggleHide);

// Categories
router.get("/categories", adminListCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", authorize("admin"), deleteCategory);

// Quick Add by URL/ASIN
router.post("/quick-add/lookup", lookupProduct);

// Click analytics for the redirect engine
router.get("/analytics/clicks", getClickStats);

module.exports = router;
