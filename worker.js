const BASE_DOMAIN = "docker.milu.moe";
const AUTH_DOMAIN = "auth-" + BASE_DOMAIN;

const UPSTREAM_REGISTRY = "https://registry-1.docker.io";
const UPSTREAM_AUTH     = "https://auth.docker.io";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      const html =
        `<h1>🎉 Cloudflare Docker Proxy is Running!</h1>
         <p>Base: ${BASE_DOMAIN}</p>
         <p>Auth: ${AUTH_DOMAIN}</p>`;
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }


    let upstream = null;
    if (url.hostname === BASE_DOMAIN)      upstream = UPSTREAM_REGISTRY;
    else if (url.hostname === AUTH_DOMAIN) upstream = UPSTREAM_AUTH;

    if (!upstream) return new Response("Not Found", { status: 404 });

    const target = new URL(upstream + url.pathname + url.search);
    let response = await fetch(new Request(target, request));

    if (
      url.hostname === BASE_DOMAIN &&
      response.status >= 300 && response.status < 400 &&
      response.headers.has("Location")
    ) {
      const headers = new Headers(request.headers);
      headers.delete("Authorization");
      response = await fetch(response.headers.get("Location"), {
        method: request.method,   // GET / HEAD
        headers,                  // 保留 Range 等头,支持断点续传
        redirect: "follow",
      });
      return new Response(response.body, response);
    }

    // 把认证服务指回自己的 auth 代理域名
    const newHeaders = new Headers(response.headers);
    if (newHeaders.has("WWW-Authenticate")) {
      newHeaders.set(
        "WWW-Authenticate",
        newHeaders.get("WWW-Authenticate").replace(UPSTREAM_AUTH, "https://" + AUTH_DOMAIN)
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};