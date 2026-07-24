// ===== Config =====
const BASE_DOMAIN = "ghcr.milu.moe";

const UPSTREAM_REGISTRY = "https://ghcr.io";
const UPSTREAM_AUTH     = "https://ghcr.io/token";

// ==================
export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      const html =
        `<h1>🎉 Cloudflare ghcr Proxy is Running!</h1>
         <p>Base: ${BASE_DOMAIN}</p>
         <p><a href="https://github.com/Mxmilu666/cloudflare-dockerhub-proxy">GitHub</a></p>`;
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    if (url.hostname !== BASE_DOMAIN) return new Response("Not Found", { status: 404 });

    let target = null;
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) {
      // Auth API
      target = new URL(UPSTREAM_AUTH + url.pathname.slice("/auth".length) + url.search);
    } else {
      // Registry API
      target = new URL(UPSTREAM_REGISTRY + url.pathname + url.search);
    }

    let response = await fetch(new Request(target, request));

    // blob 下载会 307 到 GitHub CDN,在 Worker 内部跟随,不把源站链接暴露给客户端
    if (
      response.status >= 300 && response.status < 400 &&
      response.headers.has("Location")
    ) {
      const headers = new Headers(request.headers);
      headers.delete("Authorization"); // CDN 用签名 URL,不需要认证头
      response = await fetch(response.headers.get("Location"), {
        method: request.method,   // GET / HEAD
        headers,                  // 保留 Range 等头,支持断点续传
        redirect: "follow",
      });
      return new Response(response.body, response);
    }

    // 把认证服务指回自己的 auth 代理路径
    const newHeaders = new Headers(response.headers);
    if (newHeaders.has("WWW-Authenticate")) {
      newHeaders.set(
        "WWW-Authenticate",
        newHeaders.get("WWW-Authenticate").replace(
          UPSTREAM_AUTH,
          "https://" + BASE_DOMAIN + "/auth"
        )
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
