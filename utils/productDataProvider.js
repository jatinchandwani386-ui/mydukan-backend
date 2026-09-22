/**
 * productDataProvider.js
 * ------------------------------------------------------------------
 * Powers the "Quick Add by URL/ASIN" feature.
 *
 * IMPORTANT — why this doesn't scrape Amazon's site:
 * Amazon's Conditions of Use prohibit scraping product pages, and doing
 * so risks your Associates account (and IP) being blocked. The
 * compliant way to fetch product data programmatically is the official
 * Amazon Product Advertising API (PA-API 5.0), which is free to use for
 * approved Associates and returns title, images, price, and review data
 * directly as structured JSON.
 *
 * Requirements to activate this:
 *   1. An approved Amazon Associates account with PA-API access
 *      (PA-API access is typically unlocked after your first few
 *      qualifying sales).
 *   2. `npm install amazon-paapi`
 *   3. Fill in PAAPI_* variables in your .env (see .env.example).
 *
 * Until those are set, `fetchProductData()` throws a clear, actionable
 * error instead of silently failing or returning fake data — so the
 * admin UI can surface "PA-API not configured" rather than a stack trace.
 * ------------------------------------------------------------------
 */

const { extractAsin } = require("./affiliateLink");

function isConfigured() {
  return Boolean(
    process.env.PAAPI_ACCESS_KEY &&
      process.env.PAAPI_SECRET_KEY &&
      process.env.PAAPI_PARTNER_TAG
  );
}

/**
 * Fetches product data for a single ASIN via PA-API's GetItems operation.
 * @param {string} urlOrAsin - a full Amazon product URL or a bare ASIN
 * @returns {Promise<object>} normalized product data ready to prefill the
 *   "Quick Add" form (title, description, images, price, rating, reviewCount)
 */
async function fetchProductData(urlOrAsin) {
  const asin = extractAsin(urlOrAsin);
  if (!asin) {
    const err = new Error("Could not extract a valid ASIN from the input.");
    err.statusCode = 400;
    throw err;
  }

  if (!isConfigured()) {
    const err = new Error(
      "PA-API is not configured. Set PAAPI_ACCESS_KEY, PAAPI_SECRET_KEY and " +
        "PAAPI_PARTNER_TAG in your .env, then `npm install amazon-paapi`. " +
        "See utils/productDataProvider.js for details."
    );
    err.statusCode = 501; // Not Implemented
    throw err;
  }

  // Lazy require so the whole app doesn't fail to boot for admins who
  // haven't installed/configured PA-API yet.
  let ProductAdvertisingAPIv1;
  try {
    ProductAdvertisingAPIv1 = require("amazon-paapi");
  } catch (e) {
    const err = new Error(
      "The 'amazon-paapi' package is not installed. Run `npm install amazon-paapi`."
    );
    err.statusCode = 501;
    throw err;
  }

  const commonParameters = {
    AccessKey: process.env.PAAPI_ACCESS_KEY,
    SecretKey: process.env.PAAPI_SECRET_KEY,
    PartnerTag: process.env.PAAPI_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace:
      process.env.AMAZON_DOMAIN === "amazon.com" ? "www.amazon.com" : "www.amazon.in",
  };

  const requestParameters = {
    ItemIds: [asin],
    Resources: [
      "Images.Primary.Large",
      "Images.Variants.Large",
      "ItemInfo.Title",
      "ItemInfo.Features",
      "ItemInfo.ProductInfo",
      "Offers.Listings.Price",
      "Offers.Listings.SavingBasis",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating",
    ],
  };

  const response = await ProductAdvertisingAPIv1.GetItems(commonParameters, requestParameters);
  const item = response?.ItemsResult?.Items?.[0];
  if (!item) {
    const err = new Error(`No product data returned by PA-API for ASIN ${asin}.`);
    err.statusCode = 404;
    throw err;
  }

  return normalizeItem(item, asin);
}

/** Maps PA-API's response shape onto the fields our "Quick Add" form needs. */
function normalizeItem(item, asin) {
  const listing = item.Offers?.Listings?.[0];
  const currentPrice = listing?.Price?.Amount ?? null;
  const mrp = listing?.SavingBasis?.Amount ?? currentPrice;

  return {
    asin,
    title: item.ItemInfo?.Title?.DisplayValue ?? "",
    description: (item.ItemInfo?.Features?.DisplayValues || []).join("\n"),
    images: {
      primary: item.Images?.Primary?.Large?.URL ?? "",
      gallery: (item.Images?.Variants || []).map((v) => v.Large?.URL).filter(Boolean),
    },
    price: {
      current: currentPrice,
      mrp: mrp,
      currency: listing?.Price?.Currency ?? "INR",
    },
    rating: item.CustomerReviews?.StarRating?.Value ?? 0,
    reviewCount: item.CustomerReviews?.Count ?? 0,
    originalUrl: item.DetailPageURL ?? `https://www.${process.env.AMAZON_DOMAIN}/dp/${asin}`,
  };
}

module.exports = { fetchProductData, isConfigured };
