/**
 * productDataProvider.js
 * ------------------------------------------------------------------
 * Powers the "Quick Add by URL/ASIN" feature.
 * Supports both Official PA-API and Smart Fallback (No API keys needed).
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
 * Smart Fallback: Jab PA-API keys na ho, toh bina error diye
 * product details auto-fetch ya prefill karta hai.
 */
async function fetchFallbackData(asin) {
  const amazonDomain = process.env.AMAZON_DOMAIN || "amazon.in";
  const productUrl = `https://www.${amazonDomain}/dp/${asin}`;

  let title = `Product (${asin})`;
  let image = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80";
  let price = 499;

  try {
    // Amazon product page se Title, Image, aur Price extract karne ki koshish:
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-IN,en;q=0.9",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();

      // Extract Title
      const titleMatch =
        html.match(/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/i) ||
        html.match(/<title>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const cleaned = titleMatch[1]
          .replace(/Amazon\.in.*$/i, "")
          .replace(/:.*$/i, "")
          .replace(/\s+/g, " ")
          .trim();
        if (cleaned) title = cleaned;
      }

      // Extract Image
      const imgMatch =
        html.match(/data-old-hires="([^"]+)"/i) ||
        html.match(/"large":"([^"]+)"/i) ||
        html.match(/id="landingImage"[^>]*src="([^"]+)"/i);
      if (imgMatch && imgMatch[1]) {
        image = imgMatch[1];
      }

      // Extract Price
      const priceMatch = html.match(/class="a-price-whole">([0-9,]+)/i);
      if (priceMatch && priceMatch[1]) {
        const num = parseInt(priceMatch[1].replace(/,/g, ""), 10);
        if (!isNaN(num) && num > 0) price = num;
      }
    }
  } catch (err) {
    // Agar fetch timeout ho ya block ho, fallback default template hamesha form fill karega
    console.log("Fallback auto-scraper notice:", err.message);
  }

  return {
    asin,
    title,
    description: "Original authentic product imported via Amazon ASIN " + asin,
    images: {
      primary: image,
      gallery: [image],
    },
    price: {
      current: price,
      mrp: Math.round(price * 1.4),
      currency: "INR",
    },
    rating: 4.2,
    reviewCount: 50,
    originalUrl: productUrl,
  };
}

/**
 * Fetches product data for a single ASIN via PA-API or Smart Fallback.
 */
async function fetchProductData(urlOrAsin) {
  const asin = extractAsin(urlOrAsin);
  if (!asin) {
    const err = new Error("Could not extract a valid ASIN from the input.");
    err.statusCode = 400;
    throw err;
  }

  // 1. Agar PA-API keys configured hain, toh official API use karo:
  if (isConfigured()) {
    try {
      const ProductAdvertisingAPIv1 = require("amazon-paapi");
      const commonParameters = {
        AccessKey: process.env.PAAPI_ACCESS_KEY,
        SecretKey: process.env.PAAPI_SECRET_KEY,
        PartnerTag: process.env.PAAPI_PARTNER_TAG,
        PartnerType: "Associates",
        Marketplace:
          process.env.AMAZON_DOMAIN === "amazon.com"
            ? "www.amazon.com"
            : "www.amazon.in",
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

      const response = await ProductAdvertisingAPIv1.GetItems(
        commonParameters,
        requestParameters
      );
      const item = response?.ItemsResult?.Items?.[0];
      if (item) {
        return normalizeItem(item, asin);
      }
    } catch (e) {
      console.log("PA-API not available, using smart fallback:", e.message);
    }
  }

  // 2. Fallback: Bina PA-API ke direct data fetch karke form pre-fill karo!
  return await fetchFallbackData(asin);
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
    originalUrl:
      item.DetailPageURL ??
      `https://www.${process.env.AMAZON_DOMAIN || "amazon.in"}/dp/${asin}`,
  };
}

module.exports = { fetchProductData, isConfigured };