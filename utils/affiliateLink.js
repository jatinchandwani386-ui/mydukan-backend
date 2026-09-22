/**
 * Central place that knows how to turn an ASIN into a trackable Amazon
 * buy link. Every place that needs a buy URL (Product pre-save hook,
 * the redirect engine, the quick-add importer) calls through here so the
 * tag logic only ever lives in one place.
 */

const AMAZON_DOMAIN = process.env.AMAZON_DOMAIN || "amazon.in";
const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || "[INSERT_AFFILIATE_TAG_HERE]";

/**
 * @param {string} asin - 10-character Amazon ASIN
 * @param {object} [opts]
 * @param {string} [opts.domain] - override the marketplace domain
 * @param {string} [opts.tag] - override the affiliate tag
 * @returns {string} a full, trackable Amazon product URL
 */
function buildAffiliateUrl(asin, opts = {}) {
  if (!asin) throw new Error("buildAffiliateUrl: ASIN is required");
  const domain = opts.domain || AMAZON_DOMAIN;
  const tag = opts.tag || AFFILIATE_TAG;
  return `https://www.${domain}/dp/${asin.toUpperCase()}?tag=${encodeURIComponent(tag)}`;
}

/**
 * Extracts a 10-character ASIN from any common Amazon product URL shape,
 * or returns the input unchanged if it already looks like a bare ASIN.
 * Used by the Quick Add by URL/ASIN tool.
 */
function extractAsin(input) {
  if (!input) return null;
  const trimmed = input.trim();

  // Already a bare ASIN
  if (/^[A-Z0-9]{10}$/i.test(trimmed)) return trimmed.toUpperCase();

  // /dp/ASIN, /gp/product/ASIN, /product/ASIN, ?ASIN=... variants
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /[?&]ASIN=([A-Z0-9]{10})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  return null;
}

module.exports = { buildAffiliateUrl, extractAsin };
