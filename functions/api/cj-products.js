/**
 * UPDATED VERSION: /api/cj-products
 * Tries both 'apiKey' and 'api_key' formats to be safe.
 */

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
let cached = { token: null, expires: 0, products: null, productsExpires: 0 };

async function getAccessToken(apiKey) {
  const now = Date.now();
  if (cached.token && cached.expires > now) return cached.token;

  // We try both common naming conventions for the JSON body
  const payloads = [
    { apiKey: apiKey },
    { api_key: apiKey }
  ];

  let lastError = null;
  let res;

  for (const payload of payloads) {
    try {
      res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) break; // Success!
    } catch (e) {
      lastError = e;
    }
  }

  if (!res || !res.ok) {
    const errText = res ? await res.text() : (lastError?.message || "Unknown error");
    throw new Error(`CJ auth failed: ${errText}`);
  }

  const data = await res.json();
  const token = data?.data?.accessToken || data?.accessToken;

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

async function getProducts(apiKey) {
  const now = Date.now();
  if (cached.products && cached.productsExpires > now) return cached.products;

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
    throw new Error(`CJ product list failed: ${errText}`);
  }

  const data = await res.json();
  cached.products = data;
  cached.productsExpires = now + 5 * 60 * 1000;
  return data;
}

export async function onRequestGet(context) {
  const apiKey = context.env.CJ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "CJ_API_KEY secret is not configured." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    const products = await getProducts(apiKey);
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://phillab.store",
      },
    });
  } catch (err) {
    if (err.message === "TOKEN_NOT_FOUND") {
      return new Response(JSON.stringify({ 
        debug_message: "Could not find token in expected path. Here is the full response from CJ:",
        cj_response: err.fullResponse 
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Function Error", detail: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
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
