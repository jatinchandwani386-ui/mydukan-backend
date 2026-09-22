const mongoose = require("mongoose");

/**
 * One row per outbound affiliate click. Kept separate from Product so the
 * high-write-volume redirect endpoint never contends with product reads,
 * and so you can later compute CTR / revenue-per-click analytics.
 */
const clickLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    asin: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    referrer: { type: String },
    clickedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model("ClickLog", clickLogSchema);
