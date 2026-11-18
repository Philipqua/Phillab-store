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
let cached = { token: null, expires: 0, products: null, productsExpires: 0 };

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
    const errText = await res.text();
    throw new Error(`CJ auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const token = data?.data?.accessToken;
  if (!token) {
    throw new Error("CJ auth: no accessToken in response");
  }

  const expireTime = data?.data?.expireTime;
  const ttlMs = expireTime ? new Date(expireTime).getTime() - now : 55 * 60 * 1000;
  cached.token = token;
  cached.expires = now + Math.max(ttlMs, 60_000);

  return token;
}

async function getProducts(apiKey) {
  const now = Date.now();
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
    const errText = await res.text();
    throw new Error(`CJ product list failed (${res.status}): ${errText}`);
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
        "Access-Control-Allow-Origin": "https://phillab.store",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (err) {
    // We return 500 so Cloudflare doesn't show a "Bad Gateway" error page
    return new Response(
      JSON.stringify({ 
        error: "Function Error", 
        detail: err.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

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
