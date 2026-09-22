const express = require("express");
const { redirectToAmazon } = require("../controllers/redirectController");

const router = express.Router();

// Public — this is the link every "Buy on Amazon" button points to
router.get("/:productId", redirectToAmazon);

module.exports = router;
