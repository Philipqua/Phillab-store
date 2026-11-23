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

    // Candidate token endpoints to try in order
    const candidates = [
      {
        name: "rest/auth/token/create",
        url: "https://api-sg.aliexpress.com/rest/auth/token/create",
        method: "POST",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: appKey,
          client_secret: appSecret,
          code,
          redirect_uri: redirectUri,
        }),
        contentType: "application/x-www-form-urlencoded",
      },
      {
        name: "oauth/token",
        url: "https://api-sg.aliexpress.com/oauth/token",
        method: "POST",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: appKey,
          client_secret: appSecret,
          code,
          redirect_uri: redirectUri,
        }),
        contentType: "application/x-www-form-urlencoded",
      },
      {
        name: "sync system.oauth2.getToken",
        url: "https://api-sg.aliexpress.com/sync",
        method: "POST",
        body: new URLSearchParams({
          method: "system.oauth2.getToken",
          app_key: appKey,
          app_secret: appSecret,
          code,
          redirect_uri: redirectUri,
          sign_method: "md5",
          timestamp: String(Date.now()),
          format: "json",
          v: "2.0",
        }),
        contentType: "application/x-www-form-urlencoded",
      },
    ];

    const results = [];

    for (const c of candidates) {
      try {
        const res = await fetch(c.url, {
          method: c.method,
          headers: { "Content-Type": c.contentType },
          body: c.body,
        });
        const text = await res.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text.substring(0, 300); }

        results.push({ endpoint: c.name, status: res.status, response: parsed });

        // If we got an access_token, save it and stop
        const token = parsed?.access_token || parsed?.data?.access_token;
        if (token) {
          await context.env.ALI_TOKENS.put("access_token", token);
          await context.env.ALI_TOKENS.put("refresh_token", parsed?.refresh_token || parsed?.data?.refresh_token || "");
          await context.env.ALI_TOKENS.put("expires_at", String(Date.now() + (parsed?.expires_in || 3600) * 1000));

          return new Response(
            `<html><body style="font-family:sans-serif;padding:40px;">
              <h1>✅ Connected via ${c.name}</h1>
              <p>Tokens saved. <a href="/api/ali-products">Test products →</a></p>
              <pre style="background:#f4f4f4;padding:16px;border-radius:8px;overflow:auto;">${JSON.stringify(results, null, 2)}</pre>
            </body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }
      } catch (e) {
        results.push({ endpoint: c.name, error: e.message });
      }
    }

    // None worked — show all results so we can see why
    return new Response(
      JSON.stringify({ error: "No endpoint returned a token", attempts: results }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Callback crashed", detail: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
