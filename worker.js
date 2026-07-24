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
         <p>Auth: ${AUTH_DOMAIN}</p>
         <p><a href="https://github.com/Mxmilu666/cloudflare-dockerhub-proxy">GitHub</a></p>`;
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }


    let upstream = null;
    if (url.hostname === BASE_DOMAIN)      upstream = UPSTREAM_REGISTRY;
    else if (url.hostname === AUTH_DOMAIN) upstream = UPSTREAM_AUTH;

    if (!upstream) return new Response("Not Found", { status: 404 });

    // docker pull nginx → /v2/nginx/...,官方镜像实际仓库是 library/nginx
    let pathname = url.pathname;
    if (url.hostname === BASE_DOMAIN) {
      pathname = pathname.replace(
        /^\/v2\/([^/]+)\/(manifests|blobs|tags|referrers)\//,
        (match, name, api) =>
          name === "library" ? match : `/v2/library/${name}/${api}/`
      );
    }

    // token 请求的 scope 也要同步补上 library/ 前缀
    if (url.hostname === AUTH_DOMAIN && url.searchParams.has("scope")) {
      const scopes = url.searchParams.getAll("scope").map((scope) => {
        const parts = scope.split(":");
        if (parts.length === 3 && parts[0] === "repository" && !parts[1].includes("/")) {
          parts[1] = "library/" + parts[1];
        }
        return parts.join(":");
      });
      url.searchParams.delete("scope");
      scopes.forEach((scope) => url.searchParams.append("scope", scope));
    }

    const target = new URL(upstream + pathname + url.search);
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
