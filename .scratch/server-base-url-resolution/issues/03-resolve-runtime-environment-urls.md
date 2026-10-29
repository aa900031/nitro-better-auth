# 03: Resolve development and deployment runtime URLs

**What to build:** Extend canonical URL inference to the runtime environments Nitro applications actually use. Development should recognize Nuxt's proxy and Vite URLs plus Nitro host, port, and HTTPS configuration, normalize loopback hosts, and emit one actionable warning when inference is used. Production should accept validated Vercel, Cloudflare Pages, and Netlify URLs supplied at runtime while continuing to reject listener addresses and request headers as canonical sources.

**Blocked by:** 01: Resolve the canonical auth URL for the app singleton.

**Status:** ready-for-agent

- [ ] Nuxt development proxy and confirmed Vite development URLs resolve before listener fallbacks.
- [ ] Nitro development host, port, and certificate/key settings produce the expected HTTP or HTTPS origin, with loopback hosts normalized consistently.
- [ ] `VERCEL_URL`, `CF_PAGES_URL`, and Netlify `URL` are read at runtime, normalized, validated, and used in production.
- [ ] Invalid explicit or platform environment values fail rather than silently falling through to a less trusted source.
- [ ] Production never treats `NITRO_HOST`, `HOST`, request Host, forwarded headers, wildcard listeners, or internal IP listeners as a public canonical URL.
- [ ] Development inference logs at most one warning, while explicit configuration logs none.
