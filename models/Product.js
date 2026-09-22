const mongoose = require("mongoose");
const slugify = require("slugify");

/**
 * Sub-schema for the affiliate side of a product.
 * `buyUrl` is generated automatically (see pre-save hook below) from the
 * ASIN + the tracking tag configured in the environment, so it never has
 * to be typed in by hand and stays consistent if the tag ever changes.
 */
const affiliateConfigSchema = new mongoose.Schema(
  {
    asin: {
      type: String,
      required: [true, "Amazon ASIN is required"],
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{10}$/, "ASIN must be 10 alphanumeric characters"],
      index: true,
    },
    originalUrl: {
      type: String, // the plain Amazon product URL, no tracking tag
      required: [true, "Original Amazon product URL is required"],
      trim: true,
    },
    // Auto-generated: original domain + /dp/ASIN?tag=AFFILIATE_TAG
    buyUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const priceSchema = new mongoose.Schema(
  {
    current: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 }, // "struck through" price
    currency: { type: String, default: "INR" },
    // Stored, not just computed on the fly, so it can be queried/sorted/filtered
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 300,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String, // rich text / HTML specs block
      default: "",
    },

    images: {
      primary: { type: String, required: [true, "Primary image URL is required"] },
      gallery: { type: [String], default: [] },
    },

    price: { type: priceSchema, required: true },

    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    tags: { type: [String], default: [], index: true },

    affiliate: { type: affiliateConfigSchema, required: true },

    // Admin controls
    isFeatured: { type: Boolean, default: false, index: true },
    isHidden: { type: Boolean, default: false, index: true }, // soft "hide" instead of delete
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
      index: true,
    },

    // Denormalized counters, updated by the redirect engine
    clickCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Full-text search across the fields a shopper is likely to search by
productSchema.index({ title: "text", description: "text", tags: "text" });
// Common filter/sort combos
productSchema.index({ "price.current": 1 });
productSchema.index({ rating: -1 });
productSchema.index({ category: 1, isHidden: 1, status: 1 });

/**
 * Pre-save: keep slug, discountPercent, and the affiliate buy URL
 * in sync automatically so the admin never has to compute them by hand.
 */
productSchema.pre("save", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = `${slugify(this.title, { lower: true, strict: true })}-${this._id
      .toString()
      .slice(-6)}`;
  }

  if (this.price && this.price.mrp > 0) {
    const discount = ((this.price.mrp - this.price.current) / this.price.mrp) * 100;
    this.price.discountPercent = Math.max(0, Math.round(discount));
  }

  if (this.isModified("affiliate") || !this.affiliate.buyUrl) {
    const { buildAffiliateUrl } = require("../utils/affiliateLink");
    this.affiliate.buyUrl = buildAffiliateUrl(this.affiliate.asin);
  }

  next();
});

module.exports = mongoose.model("Product", productSchema);
