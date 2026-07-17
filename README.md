# Cloudflare Docker Hub Proxy

A simple hub.docker.com proxy on cloudflare worker

[中文版README](README_zh.md)

## Setup

1. Deploy the `worker.js` to your Cloudflare Workers
2. Update the domain constants in `worker.js` with your domains
3. Bind custom domains to your Worker:
   - `your-domain.com` (base registry domain)
   - `auth-your-domain.com` (authentication domain)

## Usage

Configure your Docker client to use your proxy domains instead of Docker Hub directly.

## Configuration
```javascript
const BASE_DOMAIN = "your-domain.com";
const AUTH_DOMAIN = "auth-" + BASE_DOMAIN;
```

## License

This project is open-sourced under the `Apache-2.0 license`.