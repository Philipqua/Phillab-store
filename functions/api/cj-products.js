/**
 * Pages Function: /api/cj-products
 *
 * Fetches live products and prices from CJdropshipping with pagination.
 * Secrets required:
 *   - CJ_API_KEY  (your CJ API key)
 *   - CJ_EMAIL    (your CJ account email)
 *
 * Route: GET /api/cj-products?page=1&pageSize=10
 */

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
let cached = { token: null, expires: 0 };

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
    throw new Error(`CJ auth: no token in response: ${JSON.stringify(data)}`);
  }

  const expireTime = data?.data?.expireTime || data?.expireTime;
  const ttlMs = expireTime ? new Date(expireTime).getTime() - now : 55 * 60 * 1000;
  cached.token = token;
  cached.expires = now + Math.max(ttlMs, 60_000);

  return token;
}

async function getProducts(apiKey, email, page, pageSize) {
  const accessToken = await getAccessToken(apiKey, email);

  // CJ allows 1 request per second. Retry up to 3 times with delay.
  let res;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    const url = new URL(`${CJ_BASE}/product/listV2`);
    url.searchParams.set("pageNumber", String(page));
    url.searchParams.set("pageSize", String(pageSize));

    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "CJ-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) break;

    const body = await res.json();
    if (body?.message?.includes("Too Many Requests") && attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 1500));
      attempt++;
      continue;
    }

    throw new Error(`CJ product list failed: ${JSON.stringify(body)}`);
  }

  return await res.json();
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

  // Read pagination params from the URL (defaults: page 1, 10 per page)
  const url = new URL(context.request.url);
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "10", 10), 1), 50);

  try {
    const data = await getProducts(apiKey, email, page, pageSize);

    // Return a clean response with pagination metadata
    const content = data?.data?.content?.[0]?.productList || [];
    const totalPages = data?.data?.totalPages || 1;
    const totalRecords = data?.data?.totalRecords || 0;

    return new Response(
      JSON.stringify({
        success: true,
        page,
        pageSize,
        totalPages,
        totalRecords,
        products: content.map((p) => ({
          id: p.id,
          name: p.nameEn,
          sku: p.sku,
          image: p.bigImage,
          price: p.sellPrice,
          inventory: p.warehouseInventoryNum,
        })),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "https://phillab.store",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      }
    );
  } catch (err) {
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
