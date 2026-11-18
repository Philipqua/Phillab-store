/**
 * Pages Function: /api/cj-products
 *
 * Fetches live products and prices from CJdropshipping.
 * Requires two secrets:
 *   - CJ_API_KEY  (your CJ API key)
 *   - CJ_EMAIL    (your CJ account email)
 *
 * Route: GET /api/cj-products
 */

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
let cached = { token: null, expires: 0, products: null, productsExpires: 0 };

async function getAccessToken(apiKey, email) {
  const now = Date.now();
  if (cached.token && cached.expires > now) return cached.token;

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, apiKey }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`CJ auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const token = data?.data?.accessToken || data?.accessToken || data?.token;

  if (!token) {
    const error = new Error("TOKEN_NOT_FOUND");
    error.fullResponse = data;
    throw error;
  }

  const expireTime = data?.data?.expireTime || data?.expireTime;
  const ttlMs = expireTime ? new Date(expireTime).getTime() - now : 55 * 60 * 1000;
  cached.token = token;
  cached.expires = now + Math.max(ttlMs, 60_000);

  return token;
}

async function getProducts(apiKey, email) {
  const now = Date.now();
  if (cached.products && cached.productsExpires > now) return cached.products;

  const accessToken = await getAccessToken(apiKey, email);

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
  const email = context.env.CJ_EMAIL;

  if (!apiKey || !email) {
    return new Response(
      JSON.stringify({ error: "Missing CJ_API_KEY or CJ_EMAIL secret." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const products = await getProducts(apiKey, email);
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
    if (err.message === "TOKEN_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          debug_message: "Could not find token. Full CJ response:",
          cj_response: err.fullResponse,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Function Error", detail: err.message }),
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
