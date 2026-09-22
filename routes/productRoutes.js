const express = require("express");
const { getProducts, getProductBySlug } = require("../controllers/productController");

const router = express.Router();

// Public storefront endpoints
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);

module.exports = router;
