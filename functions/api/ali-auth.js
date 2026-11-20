export async function onRequestGet(context) {
  const appKey = context.env.ALI_APP_KEY;
  const redirectUri = "https://phillab.store/api/ali-callback";

  const authUrl = new URL("https://api-sg.aliexpress.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", appKey);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("sp", "ae");

  return Response.redirect(authUrl.toString(), 302);
}
