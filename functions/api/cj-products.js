/**
 * Pages Function: /api/cj-products
 *
 * Fetches live products and prices from CJdropshipping.
 * Secret required:
 *   - CJ_API_KEY (your CJ API key)
 *
 * Route: GET /api/cj-products
 */

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
let cached = { token: null, expires: 0, products: null, productsExpires: 0 };

async function getAccessToken(apiKey) {
  const now = Date.now();
  if (cached.token && cached.expires > now) return cached.token;

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    const errText = await res.text();
    throw new Error(`CJ auth failed (${res.status}): ${errText || "Invalid JSON response"}`);
  }

  if (!res.ok || data?.success === false || data?.result === false) {
    throw new Error(`CJ auth failed (${res.status}): ${data?.message || JSON.stringify(data)}`);
  }

  const token = data?.data?.accessToken || data?.accessToken || data?.token;

  if (!token) {
    throw new Error(`CJ returned no access token: ${JSON.stringify(data)}`);
  }

  const expireTime = data?.data?.expireTime || data?.expireTime;
  const ttlMs = expireTime
    ? new Date(expireTime).getTime() - now
    : 55 * 60 * 1000;

  cached.token = token;
  cached.expires = now + Math.max(ttlMs, 60_000);

  return token;
}

async function getProducts(apiKey) {
  const now = Date.now();
  if (cached.products && cached.productsExpires > now) return cached.products;

  const accessToken = await getAccessToken(apiKey);

  // CJ allows 1 request per second. Retry up to 3 times with delay.
  let res;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    res = await fetch(`${CJ_BASE}/product/listV2`, {
      method: "GET",
      headers: {
        "CJ-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) break;

    const body = await res.json();
    if (body?.message?.includes("Too Many Requests") && attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      attempt++;
      continue;
    }

    throw new Error(`CJ product list failed (${res.status}): ${JSON.stringify(body)}`);
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
    return new Response(
      JSON.stringify({
        error: "CJ authentication or product request failed",
        detail: err.message,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
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
