# 01: Resolve the canonical auth URL for the app singleton

**What to build:** Make the default app singleton usable without URL configuration in development while producing a deterministic, secure Better Auth endpoint. Respect an explicit Better Auth `baseURL` first, then configured site URL and `BETTER_AUTH_URL`; otherwise use a validated request origin or localhost fallback only in development. Combine the Nitro base path and handler path without changing Nitro route registration, reject invalid configured URLs, and fail clearly when production has no trusted canonical URL. Expose the pure auth-path resolution contract for reuse without coupling it to environment detection.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Development starts without a configured URL and resolves a valid canonical auth URL from the request origin or localhost fallback.
- [x] Resolution priority is explicit Better Auth `baseURL`, configured site URL, `BETTER_AUTH_URL`, development request origin, then development fallback.
- [x] Production without an explicit URL or supported environment URL throws a configuration error and never derives the canonical URL from request or forwarded headers.
- [x] Configured site URLs accept only HTTP(S), reject credentials, leading whitespace/control characters, and invalid URLs, and normalize to their origin.
- [x] Nitro base paths and unambiguous default or custom handler patterns resolve to the mounted public auth endpoint without prefixing the registered Nitro route twice.
- [x] An explicit Better Auth URL containing a pathname is treated as the complete endpoint path and is not appended again.
- [x] Automatic resolution is covered by focused tests for development, production, validation, path joining, and precedence.

## Answer

Implemented canonical URL and public auth-path resolution for the app singleton. Runtime initialization now honors explicit Better Auth options, configured site URL, `BETTER_AUTH_URL`, development request origin, and the localhost development fallback in order; production rejects request-derived origins. The pure path helpers are exported for reuse, the module passes the mounted Nitro and handler paths into runtime configuration without changing route registration, and the README documents production configuration.

Verified with focused resolver tests, the full Vitest suite, lint, package build, a zero-config Nitro development smoke test, and production smoke tests with forged forwarded headers both without and with `NUXT_PUBLIC_SITE_URL`.
