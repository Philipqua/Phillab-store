// ---- Compact MD5 (Cloudflare Workers don't have MD5 in crypto.subtle) ----
function md5(s) {
  function L(k,d){return(k<<d)|(k>>>(32-d));}
  function K(G,k){var I,d,F,H,x;F=(G&2147483648);H=(k&2147483648);I=(G&1073741824);d=(k&1073741824);x=(G&1073741823)+(k&1073741823);if(I&d){return(x^2147483648^F^H);}if(I|d){if(x&1073741824){return(x^3221225472^F^H);}else{return(x^1073741824^F^H);}}else{return(x^F^H);}}
  function r(F,d,x){return(F&d)|((~F)&x);}
  function q(F,d,x){return(F&x)|(d&(~x));}
  function p(F,d,x){return(F^d^x);}
  function n(F,d,x){return(d^(F|(~x)));}
  function u(G,F,aa,Z,k,H,I){G=K(G,K(K(r(F,aa,Z),k),I));return K(L(G,H),F);}
  function C(G,F,aa,Z,k,H,I){G=K(G,K(K(q(F,aa,Z),k),I));return K(L(G,H),F);}
  function D(G,F,aa,Z,k,H,I){G=K(G,K(K(p(F,aa,Z),k),I));return K(L(G,H),F);}
  function A(G,F,aa,Z,k,H,I){G=K(G,K(K(n(F,aa,Z),k),I));return K(L(G,H),F);}
  function e(G){var Z;var F=G.length;var x=F+8;var k=(x-(x%64))/64;var I=(k+1)*16;var aa=Array(I-1);var d=0;var H=0;while(H<F){Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=(aa[Z]|(G.charCodeAt(H)<<d));H++;}Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=aa[Z]|(128<<d);aa[I-2]=F<<3;aa[I-1]=F>>>29;return aa;}
  function B(x){var k="",F="",G,d;for(d=0;d<=3;d++){G=(x>>>(d*8))&255;F="0"+G.toString(16);k=k+F.substr(F.length-2,2);}return k;}
  function J(k){k=k.replace(/rn/g,"n");var d="";for(var F=0;F<k.length;F++){var x=k.charCodeAt(F);if(x<128){d+=String.fromCharCode(x);}else{if((x>127)&&(x<2048)){d+=String.fromCharCode((x>>6)|192);d+=String.fromCharCode((x&63)|128);}else{d+=String.fromCharCode((x>>12)|224);d+=String.fromCharCode(((x>>6)&63)|128);d+=String.fromCharCode((x&63)|128);}}}return d;}
  var C=Array();var P,h,E,v,g,Y,X,W,V,S=7,T=12,U=17,R=22,o=5,m=9,l=14,j=20,a=4,z=11,y=16,w=23,c=6,b=10,s=15,t=21;
  s=J(s);C=e(s);Y=1732584193;X=4023233417;W=2562383102;V=271733878;
  for(P=0;P<C.length;P+=16){h=Y;E=X;v=W;g=V;
    Y=u(Y,X,W,V,C[P+0],S,3614090360);V=u(V,Y,X,W,C[P+1],T,3905402710);W=u(W,V,Y,X,C[P+2],U,606105819);X=u(X,W,V,Y,C[P+3],R,3250441966);
    Y=u(Y,X,W,V,C[P+4],S,4118548399);V=u(V,Y,X,W,C[P+5],T,1200080426);W=u(W,V,Y,X,C[P+6],U,2821735955);X=u(X,W,V,Y,C[P+7],R,4249261313);
    Y=u(Y,X,W,V,C[P+8],S,1770035416);V=u(V,Y,X,W,C[P+9],T,2336552879);W=u(W,V,Y,X,C[P+10],U,4294925233);X=u(X,W,V,Y,C[P+11],R,2304563134);
    Y=u(Y,X,W,V,C[P+12],S,1804603682);V=u(V,Y,X,W,C[P+13],T,4254626195);W=u(W,V,Y,X,C[P+14],U,2792965006);X=u(X,W,V,Y,C[P+15],R,1236535329);
    Y=C(Y,X,W,V,C[P+1],o,4129170786);V=C(V,Y,X,W,C[P+6],m,3225465664);W=C(W,V,Y,X,C[P+11],l,643717713);X=C(X,W,V,Y,C[P+0],j,3921069994);
    Y=C(Y,X,W,V,C[P+5],o,3593408605);V=C(V,Y,X,W,C[P+10],m,38016083);W=C(W,V,Y,X,C[P+15],l,3634488961);X=C(X,W,V,Y,C[P+4],j,3889429448);
    Y=C(Y,X,W,V,C[P+9],o,568446438);V=C(V,Y,X,W,C[P+14],m,3275163606);W=C(W,V,Y,X,C[P+3],l,4107603335);X=C(X,W,V,Y,C[P+8],j,1163531501);
    Y=C(Y,X,W,V,C[P+13],o,2850285829);V=C(V,Y,X,W,C[P+2],m,4243563512);W=C(W,V,Y,X,C[P+7],l,1735328473);X=C(X,W,V,Y,C[P+12],j,2368359562);
    Y=D(Y,X,W,V,C[P+5],a,4294588738);V=D(V,Y,X,W,C[P+8],z,2272392833);W=D(W,V,Y,X,C[P+11],y,1839030562);X=D(X,W,V,Y,C[P+14],w,4259657740);
    Y=D(Y,X,W,V,C[P+1],a,2763975236);V=D(V,Y,X,W,C[P+4],z,1272893353);W=D(W,V,Y,X,C[P+7],y,4139469664);X=D(X,W,V,Y,C[P+10],w,3200236656);
    Y=D(Y,X,W,V,C[P+13],a,681279174);V=D(V,Y,X,W,C[P+0],z,3936430074);W=D(W,V,Y,X,C[P+3],y,3572445317);X=D(X,W,V,Y,C[P+6],w,76029189);
    Y=D(Y,X,W,V,C[P+9],a,3654602809);V=D(V,Y,X,W,C[P+12],z,3873151461);W=D(W,V,Y,X,C[P+15],y,530742520);X=D(X,W,V,Y,C[P+2],w,3299628645);
    Y=A(Y,X,W,V,C[P+0],c,4096336452);V=A(V,Y,X,W,C[P+7],b,1126891415);W=A(W,V,Y,X,C[P+14],s,2878612391);X=A(X,W,V,Y,C[P+5],t,4237533241);
    Y=A(Y,X,W,V,C[P+12],c,1700485571);V=A(V,Y,X,W,C[P+3],b,2399980690);W=A(W,V,Y,X,C[P+10],s,4293915773);X=A(X,W,V,Y,C[P+1],t,2240044497);
    Y=A(Y,X,W,V,C[P+8],c,1873313359);V=A(V,Y,X,W,C[P+15],b,4264355552);W=A(W,V,Y,X,C[P+6],s,2734768916);X=A(X,W,V,Y,C[P+13],t,1309151649);
    Y=A(Y,X,W,V,C[P+4],c,4149444226);V=A(V,Y,X,W,C[P+11],b,3174756917);W=A(W,V,Y,X,C[P+2],s,718787259);X=A(X,W,V,Y,C[P+9],t,3951481745);
    Y=K(Y,h);X=K(X,E);W=K(W,v);V=K(V,g);}
  return (B(Y)+B(X)+B(W)+B(V)).toLowerCase();
}

// ---- AliExpress TOP-style signature ----
function aliexpressSign(params, secret) {
  const keys = Object.keys(params).sort();
  let str = secret;
  for (const k of keys) str += k + params[k];
  str += secret;
  return md5(str).toUpperCase();
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

    const params = {
      app_key: appKey,
      timestamp: String(Date.now()),
      sign_method: "md5",
      code: code,
    };
    params.sign = aliexpressSign(params, appSecret);

    const res = await fetch("https://api-sg.aliexpress.com/rest/auth/token/create", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 500) }; }

    const token = data?.access_token || data?.data?.access_token;
    if (!token) {
      return new Response(
        JSON.stringify({ error: "No access_token", status: res.status, response: data }, null, 2),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    await context.env.ALI_TOKENS.put("access_token", token);
    await context.env.ALI_TOKENS.put("refresh_token", data?.refresh_token || data?.data?.refresh_token || "");
    await context.env.ALI_TOKENS.put("expires_at", String(Date.now() + (data?.expires_in || 3600) * 1000));

    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;">
        <h1>✅ AliExpress Connected!</h1>
        <p>Tokens saved. <a href="/api/ali-products">Test products →</a></p>
        <pre style="background:#f4f4f4;padding:16px;border-radius:8px;overflow:auto;">${JSON.stringify(data, null, 2)}</pre>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Callback crashed", detail: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
