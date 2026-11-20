export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  const appKey = context.env.ALI_APP_KEY;
  const appSecret = context.env.ALI_APP_SECRET;
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

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return new Response(JSON.stringify({ error: "Token exchange failed", detail: tokenData }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Store tokens in KV
  await context.env.ALI_TOKENS.put("access_token", tokenData.access_token);
  await context.env.ALI_TOKENS.put("refresh_token", tokenData.refresh_token || "");
  await context.env.ALI_TOKENS.put("expires_at", String(Date.now() + (tokenData.expires_in || 3600) * 1000));

  return new Response(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h1>✅ AliExpress Connected!</h1>
      <p>Your tokens have been saved. You can now fetch products.</p>
      <p><a href="/api/ali-products">Test the product endpoint →</a></p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
