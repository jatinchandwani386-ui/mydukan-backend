const Product = require("../models/Product");
const ClickLog = require("../models/ClickLog");
const { buildAffiliateUrl } = require("../utils/affiliateLink");

/**
 * GET /api/redirect/:productId
 * The link every "Buy on Amazon" button on the storefront points to.
 * Logs the click (fire-and-forget, never blocks the redirect) and then
 * 302-redirects the visitor straight to Amazon with the affiliate tag.
 *
 * Frontend note: to open this in a new tab, use
 *   <a href="/api/redirect/:id" target="_blank" rel="noopener">Buy on Amazon</a>
 * — the redirect itself is a normal server-side 302, target="_blank" is
 * just how the browser opens the resulting page in a new tab.
 */
async function redirectToAmazon(req, res, next) {
  try {
    const product = await Product.findById(req.params.productId).select(
      "affiliate.asin affiliate.buyUrl isHidden status"
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Build fresh (rather than trusting the stored buyUrl) so a tag change
    // in .env takes effect immediately without re-saving every product.
    const target = buildAffiliateUrl(product.affiliate.asin);

    // Don't await — a slow DB write should never delay the visitor's redirect.
    ClickLog.create({
      product: product._id,
      asin: product.affiliate.asin,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      referrer: req.get("Referer"),
    }).catch((err) => console.error("[redirect] click log failed:", err.message));

    Product.updateOne({ _id: product._id }, { $inc: { clickCount: 1 } }).catch((err) =>
      console.error("[redirect] click counter failed:", err.message)
    );

    return res.redirect(302, target);
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/analytics/clicks — simple click-volume report for the dashboard */
async function getClickStats(req, res, next) {
  try {
    const { productId, days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const match = { clickedAt: { $gte: since } };
    if (productId) match.product = productId;

    const stats = await ClickLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$product",
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productId: "$product._id",
          title: "$product.title",
          clicks: 1,
        },
      },
    ]);

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

module.exports = { redirectToAmazon, getClickStats };
