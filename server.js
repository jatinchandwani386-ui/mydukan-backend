require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const redirectRoutes = require("./routes/redirectRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cashbackRoutes = require("./routes/cashbackRoutes"); // <-- Added Cashback Routes

connectDB();

const app = express();

// --- Core middleware ---
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Basic abuse protection on the public API (tune per your traffic)
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use("/api/products", publicLimiter);
app.use("/api/redirect", publicLimiter);

// --- Routes ---
app.get("/api/health", (req, res) => res.json({ success: true, message: "My Dukan API is up" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/redirect", redirectRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cashback", cashbackRoutes); // <-- Registered /api/cashback

// Serve the lightweight built-in admin dashboard as static files
app.use("/admin", express.static("admin-dashboard"));

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[server] My Dukan API running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
});

module.exports = app;