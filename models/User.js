const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    // Admin login ke liye email (sparse: true taaki mobile users par error na aaye)
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    // Normal users ke liye mobile number
    mobile: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
    },
    password: { 
      type: String, 
      required: true, 
      minlength: 6, 
      select: false 
    },
    // Cashback Payouts ke liye Mandatory UPI ID
    upiId: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "editor", "user"], // Added 'user' for cashback customers
      default: "user",
    },
    // Cashback tracking metrics
    totalCashbackEarned: { 
      type: Number, 
      default: 0 
    },
    totalCashbackPaid: { 
      type: Number, 
      default: 0 
    },
  },
  { timestamps: true }
);

// Password auto-hash (Aapka exact 12-round salt preservation)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password compare method (Aapka original function)
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);