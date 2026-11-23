export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    const appKey = context.env.ALI_APP_KEY;
    const appSecret = context.env.ALI_APP_SECRET;
    const redirectUri = "https://phillab.store/api/ali-callback";

    if (!appKey || !appSecret) {
      return new Response(JSON.stringify({ error: "Missing ALI_APP_KEY or ALI_APP_SECRET" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    // Correct endpoint: rest/auth/token/create, with app_key / app_secret
    const res = await fetch("https://api-sg.aliexpress.com/rest/auth/token/create", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        app_key: appKey,
        app_secret: appSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 500) }; }

    // Look for the token in common response shapes
    const token = data?.access_token || data?.data?.access_token || data?.token;
    const refresh = data?.refresh_token || data?.data?.refresh_token || "";

    if (!token) {
      return new Response(
        JSON.stringify({ error: "No access_token in response", status: res.status, response: data }, null, 2),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    await context.env.ALI_TOKENS.put("access_token", token);
    await context.env.ALI_TOKENS.put("refresh_token", refresh);
    await context.env.ALI_TOKENS.put("expires_at", String(Date.now() + (data?.expires_in || 3600) * 1000));

    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;">
        <h1>✅ AliExpress Connected!</h1>
        <p>Tokens saved successfully.</p>
        <p><a href="/api/ali-products">Test the product endpoint →</a></p>
        <pre style="background:#f4f4f4;padding:16px;border-radius:8px;overflow:auto;">${JSON.stringify(data, null, 2)}</pre>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Callback crashed", detail: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
