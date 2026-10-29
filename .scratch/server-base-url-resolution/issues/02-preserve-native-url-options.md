# 02: Preserve native Better Auth URL options and opt-out boundaries

**What to build:** Keep the automatic resolver compatible with existing Better Auth configuration. Turning off automatic resolution must leave all URL-related options untouched. Explicit string and dynamic object `baseURL` forms, `basePath`, `trustedOrigins`, and `advanced.trustedProxyHeaders` must retain their native semantics; routing-prefix completion may only occur under a documented, deterministic rule when an explicit string URL has no pathname. Development should diagnose an explicit base path that does not match the mounted endpoint without changing it.

**Blocked by:** 01: Resolve the canonical auth URL for the app singleton.

**Status:** resolved

- [x] `autoBaseURL` is public module configuration, defaults to enabled, and disabling it injects or modifies no URL, base-path, or trusted-origin option.
- [x] Explicit string `baseURL` and `basePath` values are not overwritten, and URL path completion follows a tested rule without duplicating endpoint paths.
- [x] Better Auth's object `baseURL` form, including `allowedHosts` and `protocol`, passes through unchanged on versions that support it.
- [x] `trustedOrigins` and `advanced.trustedProxyHeaders` pass through unchanged outside the separate development enhancement.
- [x] A mismatched explicit `basePath` produces a development diagnostic but remains user-controlled.
- [x] Compatibility tests do not require the package's full `^1.2.0` peer range to support newer `allowedHosts` behavior.

## Answer

Added the default-enabled `autoBaseURL` module option and passed it through Nitro runtime configuration. Disabling it now returns the user's Better Auth options unchanged without reading or validating automatic URL sources. Explicit string URLs, explicit base paths, dynamic `allowedHosts` URL objects, trusted origins, and trusted proxy settings retain their native values and references.

For an explicit string URL containing only an origin, the resolver supplies the mounted auth path as `basePath` only when the endpoint differs from Better Auth's default and the user did not provide a base path. Existing URL pathnames are never appended again. Development reports a mismatched explicit base path without changing it; production remains silent. The README documents both the completion rule and opt-out.
