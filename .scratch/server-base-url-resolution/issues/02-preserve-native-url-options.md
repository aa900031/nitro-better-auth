# 02: Preserve native Better Auth URL options and opt-out boundaries

**What to build:** Keep the automatic resolver compatible with existing Better Auth configuration. Turning off automatic resolution must leave all URL-related options untouched. Explicit string and dynamic object `baseURL` forms, `basePath`, `trustedOrigins`, and `advanced.trustedProxyHeaders` must retain their native semantics; routing-prefix completion may only occur under a documented, deterministic rule when an explicit string URL has no pathname. Development should diagnose an explicit base path that does not match the mounted endpoint without changing it.

**Blocked by:** 01: Resolve the canonical auth URL for the app singleton.

**Status:** ready-for-agent

- [ ] `autoBaseURL` is public module configuration, defaults to enabled, and disabling it injects or modifies no URL, base-path, or trusted-origin option.
- [ ] Explicit string `baseURL` and `basePath` values are not overwritten, and URL path completion follows a tested rule without duplicating endpoint paths.
- [ ] Better Auth's object `baseURL` form, including `allowedHosts` and `protocol`, passes through unchanged on versions that support it.
- [ ] `trustedOrigins` and `advanced.trustedProxyHeaders` pass through unchanged outside the separate development enhancement.
- [ ] A mismatched explicit `basePath` produces a development diagnostic but remains user-controlled.
- [ ] Compatibility tests do not require the package's full `^1.2.0` peer range to support newer `allowedHosts` behavior.
