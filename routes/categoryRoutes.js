const express = require("express");
const { getCategoryTree } = require("../controllers/categoryController");

const router = express.Router();

router.get("/", getCategoryTree);

module.exports = router;
