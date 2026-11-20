/**
 * Pages Function: /api/cj-products
 * Supports Pagination and Category Filtering
 * 
 * Route: GET /api/cj-products?page=1&pageSize=10&categoryId=123
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
  if (!token) throw new Error("CJ auth: no token in response");

  const expireTime = data?.data?.expireTime || data?.expireTime;
  const ttlMs = expireTime ? new Date(expireTime).getTime() - now : 55 * 60 * 1000;
  cached.token = token;
  cached.expires = now + Math.max(ttlMs, 60_000);
  return token;
}

async function getProducts(apiKey, email, page, pageSize, categoryId) {
  const accessToken = await getAccessToken(apiKey, email);
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    const url = new URL(`${CJ_BASE}/product/listV2`);
    url.searchParams.set("pageNumber", String(page));
    url.searchParams.set("pageSize", String(pageSize));
    if (categoryId) url.searchParams.set("categoryId", categoryId);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "CJ-Access-Token": accessToken, "Content-Type": "application/json" },
    });

    if (res.ok) return await res.json();

    const body = await res.json();
    if (body?.message?.includes("Too Many Requests") && attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 1500));
      attempt++;
      continue;
    }
    throw new Error(`CJ API Error: ${JSON.stringify(body)}`);
  }
}

export async function onRequestGet(context) {
  const apiKey = context.env.CJ_API_KEY;
  const email = context.env.CJ_EMAIL;
  const url = new URL(context.request.url);

  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "10", 10), 1), 50);
  const categoryId = url.searchParams.get("categoryId");

  try {
    const data = await getProducts(apiKey, email, page, pageSize, categoryId);
    const content = data?.data?.content?.[0]?.productList || [];

    return new Response(JSON.stringify({
      success: true,
      page,
      pageSize,
      totalPages: data?.data?.totalPages || 1,
      totalRecords: data?.data?.totalRecords || 0,
      products: content.map(p => ({
        id: p.id,
        name: p.nameEn,
        sku: p.sku,
        image: p.bigImage,
        price: p.sellPrice,
        category: p.categoryId, // Crucial for filtering
        inventory: p.warehouseInventoryNum
      }))
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "https://phillab.store" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
