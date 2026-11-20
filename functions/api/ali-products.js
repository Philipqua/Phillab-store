const API_GATEWAY = "https://api-sg.aliexpress.com/sync";

async function getValidToken(context) {
  const kv = context.env.ALI_TOKENS;
  let accessToken = await kv.get("access_token");
  const expiresAt = parseInt(await kv.get("expires_at") || "0", 10);

  // Refresh if expired or about to expire (within 5 minutes)
  if (!accessToken || Date.now() > expiresAt - 300_000) {
    const refreshToken = await kv.get("refresh_token");
    if (!refreshToken) throw new Error("No refresh token — please re-authorize at /api/ali-auth");

    const res = await fetch("https://api-sg.aliexpress.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: context.env.ALI_APP_KEY,
        client_secret: context.env.ALI_APP_SECRET,
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error("Token refresh failed");

    accessToken = data.access_token;
    await kv.put("access_token", accessToken);
    await kv.put("expires_at", String(Date.now() + (data.expires_in || 3600) * 1000));
    if (data.refresh_token) await kv.put("refresh_token", data.refresh_token);
  }

  return accessToken;
}

export async function onRequestGet(context) {
  try {
    const accessToken = await getValidToken(context);
    const url = new URL(context.request.url);
    const page = url.searchParams.get("page") || "1";
    const pageSize = url.searchParams.get("pageSize") || "10";

    // AliExpress Dropshipping product list
    const params = new URLSearchParams({
      method: "aliexpress.ds.product.list",
      app_key: context.env.ALI_APP_KEY,
      session: accessToken,
      timestamp: String(Date.now()),
      format: "json",
      v: "2.0",
      sign_method: "md5",
      page_no: page,
      page_size: pageSize,
    });

    const res = await fetch(`${API_GATEWAY}?${params.toString()}`);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://phillab.store",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
