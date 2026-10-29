# 03: Resolve development and deployment runtime URLs

**What to build:** Extend canonical URL inference to the runtime environments Nitro applications actually use. Development should recognize Nuxt's proxy and Vite URLs plus Nitro host, port, and HTTPS configuration, normalize loopback hosts, and emit one actionable warning when inference is used. Production should accept validated Vercel, Cloudflare Pages, and Netlify URLs supplied at runtime while continuing to reject listener addresses and request headers as canonical sources.

**Blocked by:** 01: Resolve the canonical auth URL for the app singleton.

**Status:** resolved

- [x] Nuxt development proxy and confirmed Vite development URLs resolve before listener fallbacks.
- [x] Nitro development host, port, and certificate/key settings produce the expected HTTP or HTTPS origin, with loopback hosts normalized consistently.
- [x] `VERCEL_URL`, `CF_PAGES_URL`, and Netlify `URL` are read at runtime, normalized, validated, and used in production.
- [x] Invalid explicit or platform environment values fail rather than silently falling through to a less trusted source.
- [x] Production never treats `NITRO_HOST`, `HOST`, request Host, forwarded headers, wildcard listeners, or internal IP listeners as a public canonical URL.
- [x] Development inference logs at most one warning, while explicit configuration logs none.

## Answer

Added lazy runtime environment resolution after explicit Better Auth and site URL sources. Development recognizes Nuxt proxy metadata, confirmed Vite metadata, and Nitro listener host, port, and TLS settings; loopback and wildcard listener hosts normalize to localhost. Production ignores listener and request sources while accepting validated Vercel, Cloudflare Pages, and Netlify URLs supplied at runtime.

Invalid selected platform values now fail with source-specific errors. Development inference reports the selected resolved endpoint once per Nitro app, while configured sources stay silent. Tests cover precedence, malformed values, IPv4/IPv6 and TLS listeners, production boundaries, and diagnostics; a production Nitro smoke test confirmed `VERCEL_URL` wins despite forged forwarded headers.
