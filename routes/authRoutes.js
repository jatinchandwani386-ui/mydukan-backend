const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// Token generator
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "mysecretkey123456789mydukan",
    { expiresIn: "30d" }
  );
};

// 1. REGISTER (Customer Signup with Name, Mobile, Password, UPI ID)
router.post("/register", async (req, res) => {
  try {
    const { name, mobile, password, upiId, email } = req.body;

    if (!name || !mobile || !password || !upiId) {
      return res.status(400).json({
        success: false,
        message: "Full Name, Mobile Number, Password, and UPI ID are all required.",
      });
    }

    const cleanMobile = mobile.trim();

    // Check duplicate mobile
    const existingUser = await User.findOne({ mobile: cleanMobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This mobile number is already registered. Please sign in instead.",
      });
    }

    // Create user in MongoDB
    const user = await User.create({
      name: name.trim(),
      mobile: cleanMobile,
      password,
      upiId: upiId.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      role: "user",
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        upiId: user.upiId,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Registration failed" 
    });
  }
});

// 2. LOGIN (Supports BOTH Mobile for users & Email for admins!)
router.post("/login", async (req, res) => {
  try {
    const { mobile, email, password } = req.body;

    if (!password || (!mobile && !email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter your mobile number (or email) and password.",
      });
    }

    // Chahe user Mobile se aaye ya Admin Email se aaye:
    const query = mobile 
      ? { mobile: mobile.trim() } 
      : { email: email.toLowerCase().trim() };

    const user = await User.findOne(query).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. User not found.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        upiId: user.upiId,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Login failed" 
    });
  }
});

// 3. CURRENT USER DETAILS
router.get("/me", protect, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        _id: req.user._id,
        name: req.user.name,
        mobile: req.user.mobile,
        upiId: req.user.upiId,
        role: req.user.role,
        totalCashbackPaid: req.user.totalCashbackPaid || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;