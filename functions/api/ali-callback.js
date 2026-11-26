async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function hmacSha256Hex(key, msg) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function sortedConcat(params) {
  return Object.keys(params).sort().map(k => k + params[k]).join("");
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const code = url.searchParams.get("code");
    if (!code) return new Response("Missing authorization code", { status: 400 });

    const appKey = context.env.ALI_APP_KEY;
    const appSecret = context.env.ALI_APP_SECRET;
    if (!appKey || !appSecret) {
      return new Response(JSON.stringify({ error: "Missing ALI_APP_KEY or ALI_APP_SECRET" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    const base = { app_key: appKey, timestamp: String(Date.now()), sign_method: "sha256", code };
    const concat = sortedConcat(base);

    const variants = [
      { name: "sha256(secret+concat+secret)", fn: () => sha256Hex(appSecret + concat + appSecret) },
      { name: "sha256(secret+concat)", fn: () => sha256Hex(appSecret + concat) },
      { name: "hmac(secret, concat)", fn: () => hmacSha256Hex(appSecret, concat) },
      { name: "hmac(secret, secret+concat+secret)", fn: () => hmacSha256Hex(appSecret, appSecret + concat + appSecret) },
    ];

    const results = [];

    for (const v of variants) {
      const sign = await v.fn();
      const params = { ...base, sign };
      const res = await fetch("https://api-sg.aliexpress.com/rest/auth/token/create", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 300) }; }

      const token = data?.access_token || data?.data?.access_token;
      results.push({ variant: v.name, response: data });

      if (token) {
        await context.env.ALI_TOKENS.put("access_token", token);
        await context.env.ALI_TOKENS.put("refresh_token", data?.refresh_token || data?.data?.refresh_token || "");
        await context.env.ALI_TOKENS.put("expires_at", String(Date.now() + (data?.expires_in || 3600) * 1000));
        return new Response(
          `<html><body style="font-family:sans-serif;padding:40px;">
            <h1>✅ Connected via "${v.name}"</h1>
            <p>Tokens saved. <a href="/api/ali-products">Test products →</a></p>
            <pre style="background:#f4f4f4;padding:16px;border-radius:8px;overflow:auto;">${JSON.stringify(data, null, 2)}</pre>
          </body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "No variant worked", results }, null, 2), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Callback crashed", detail: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
