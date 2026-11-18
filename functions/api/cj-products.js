/**
 * Pages Function: /api/cj-products
 *
 * Fetches live products and prices from CJdropshipping.
 * Your CJ API key is stored as the encrypted secret CJ_API_KEY
 * (Pages > Settings > Variables and Secrets) and is never exposed
 * to the browser.
 *
 * Route: GET /api/cj-products
 */

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

// Simple in-memory cache to reduce calls to CJ's API.
// Each Cloudflare isolate keeps this for its lifetime; it is not
// global/durable, but it helps within bursts of traffic.
let cached = { token: null, expires: 0, products: null, productsExpires: 0 };

/**
 * Exchange the CJ API key for a short-lived access token.
 * Adjust the endpoint / payload shape to match CJ's current auth docs:
 * https://developers.cjdropshipping.com
 */
async function getAccessToken(apiKey) {
  const now = Date.now();
  if (cached.token && cached.expires > now) {
    return cached.token;
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    throw new Error(`CJ auth failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // CJ typically returns { code, message, data: { accessToken, expireTime } }
  const token = data?.data?.accessToken;
  if (!token) {
    throw new Error("CJ auth: no accessToken in response");
  }

  // Cache the token; default to 55 minutes if no expiry is provided.
  const expireTime = data?.data?.expireTime;
  const ttlMs = expireTime ? new Date(expireTime).getTime() - now : 55 * 60 * 1000;
  cached.token = token;
  cached.expires = now + Math.max(ttlMs, 60_000); // at least 1 min

  return token;
}

/**
 * Fetch the product list from CJdropshipping.
 */
async function getProducts(apiKey) {
  const now = Date.now();
  // Cache products for 5 minutes to respect CJ rate limits.
  if (cached.products && cached.productsExpires > now) {
    return cached.products;
  }

  const accessToken = await getAccessToken(apiKey);

  const res = await fetch(`${CJ_BASE}/product/listV2`, {
    method: "GET",
    headers: {
      "CJ-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`CJ product list failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cached.products = data;
  cached.productsExpires = now + 5 * 60 * 1000;

  return data;
}

export async function onRequestGet(context) {
  const apiKey = context.env.CJ_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "CJ_API_KEY secret is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const products = await getProducts(apiKey);

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
        // Allow your own site to call this endpoint from the browser.
        "Access-Control-Allow-Origin": "https://phillab.store",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch CJ products", detail: err.message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Handle CORS preflight requests
export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://phillab.store",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
