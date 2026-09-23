const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protects routes. Expects `Authorization: Bearer <token>`.
 * Attaches the authenticated user to req.user.
 */
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authenticated, token missing" });
    }

    const token = header.split(" ")[1];
    const secret = process.env.JWT_SECRET || "mysecretkey123456789mydukan";
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/** 
 * Restricts a route to specific roles, e.g. authorize("admin", "editor") 
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not authorized for this action" });
    }
    next();
  };
}

// Cashback system aur admin routes ke liye convenient helper:
const adminOnly = authorize("admin", "editor");

module.exports = { protect, authorize, adminOnly };