// functions/api/ali-callback.js

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response(
      JSON.stringify({ error: "Missing ?code= parameter from AliExpress redirect" }, null, 2),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // .trim() removes any accidental spaces/newlines copied into Cloudflare Secrets
  const appKey = (env.ALI_APP_KEY || "").trim();
  const appSecret = (env.ALI_APP_SECRET || "").trim();

  if (!appKey || !appSecret) {
    return new Response(
      JSON.stringify({ error: "ALI_APP_KEY or ALI_APP_SECRET is missing in Cloudflare Secrets" }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiPath = "/auth/token/create";
  const params = {
    app_key: appKey,
    code: code.trim(),
    sign_method: "hmac-sha256",
    timestamp: Date.now().toString()
  };

  // IOP System API signature: apiPath + sorted key+value pairs
  const sortedKeys = Object.keys(params).sort();
  const signBase = apiPath + sortedKeys.map((k) => `${k}${params[k]}`).join("");

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signBase));
  params.sign = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  try {
    const tokenRes = await fetch(`https://api-sg.aliexpress.com/rest${apiPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams(params).toString()
    });

    const rawText = await tokenRes.text();

    return new Response(
      JSON.stringify(
        {
          http_status: tokenRes.status,
          ali_response: rawText ? JSON.parse(rawText) : { raw: "" }
        },
        null,
        2
      ),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Token exchange request failed", details: err.message }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
