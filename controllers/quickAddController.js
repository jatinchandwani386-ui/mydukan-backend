const { fetchProductData } = require("../utils/productDataProvider");
const { buildAffiliateUrl } = require("../utils/affiliateLink");

/**
 * POST /api/admin/quick-add/lookup
 * Body: { input: "<Amazon URL or ASIN>" }
 *
 * Does NOT save anything — it fetches + normalizes product data via PA-API
 * and hands back a ready-to-review draft. The admin checks it in the UI
 * and then calls the normal POST /api/admin/products to actually save it.
 * Keeping "fetch" and "save" as two steps means a bad/incomplete PA-API
 * response never silently creates a broken product.
 */
async function lookupProduct(req, res, next) {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ success: false, message: "Provide an Amazon URL or ASIN" });
    }

    const data = await fetchProductData(input);

    // Pre-fill the affiliate block so the admin can just hit "Save" if the
    // fetched data looks right.
    const draft = {
      ...data,
      affiliate: {
        asin: data.asin,
        originalUrl: data.originalUrl,
        buyUrl: buildAffiliateUrl(data.asin),
      },
    };

    res.json({ success: true, data: draft });
  } catch (err) {
    next(err);
  }
}

module.exports = { lookupProduct };
