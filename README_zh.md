# Cloudflare Docker Hub Proxy

基于 Cloudflare Worker 的简单 hub.docker.com 代理服务

## 使用

1. 将 `worker.js` 部署到您的 Cloudflare Worker
2. 根据您的域名更新 `worker.js` 中的配置部分
3. 将自定义域名绑定到您的 Worker:
   - `your-domain.com` (基础注册域名)
   - `auth-your-domain.com` (身份验证域名)

## Usage

配置您的 Docker 客户端，使其使用您的镜像，而不是直接使用 Docker Hub

## Configuration
```javascript
const BASE_DOMAIN = "your-domain.com";
const AUTH_DOMAIN = "auth-" + BASE_DOMAIN;
```

## License

本项目遵循 `Apache-2.0 license` 开源协议