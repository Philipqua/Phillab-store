export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    const appKey = context.env.ALI_APP_KEY;
    const appSecret = context.env.ALI_APP_SECRET;

    if (!appKey || !appSecret) {
      return new Response(JSON.stringify({ error: "Missing ALI_APP_KEY or ALI_APP_SECRET" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!context.env.ALI_TOKENS) {
      return new Response(JSON.stringify({ error: "KV binding ALI_TOKENS is not available" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const redirectUri = "https://phillab.store/api/ali-callback";

    // Exchange the code for an access token
    const tokenRes = await fetch("https://api-sg.aliexpress.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: appKey,
        client_secret: appSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    // Read as text first so we can show the raw response if it's not JSON
    const rawText = await tokenRes.text();

    let tokenData;
    try {
      tokenData = JSON.parse(rawText);
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "AliExpress returned a non-JSON response",
          status: tokenRes.status,
          raw: rawText.substring(0, 1000),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!tokenData.access_token) {
      return new Response(
        JSON.stringify({ error: "Token exchange failed", detail: tokenData }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Store tokens in KV
    await context.env.ALI_TOKENS.put("access_token", tokenData.access_token);
    await context.env.ALI_TOKENS.put("refresh_token", tokenData.refresh_token || "");
    await context.env.ALI_TOKENS.put(
      "expires_at",
      String(Date.now() + (tokenData.expires_in || 3600) * 1000)
    );

    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h1>✅ AliExpress Connected!</h1>
        <p>Your tokens have been saved.</p>
        <p><a href="/api/ali-products">Test the product endpoint →</a></p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Callback crashed", detail: err.message, stack: err.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
