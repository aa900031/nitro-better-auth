# 05: Merge development trusted origins safely

**What to build:** In development only, enhance the user's Better Auth trusted origins with the inferred localhost origin, Nitro development origin, and the current auth Request origin. Preserve both array and async callback configuration forms, including their request argument and undefined-request behavior, while filtering unusable entries and removing duplicates. Production must pass the user's configuration through unchanged.

**Blocked by:** 03: Resolve development and deployment runtime URLs; 04: Isolate resolved origins across singleton lifecycles.

**Status:** resolved

- [x] Development merges configured origins with normalized localhost, Nitro development, and current Request origins without duplicates or empty values.
- [x] Array configuration retains every valid user origin and can include the current Request origin when Better Auth invokes it.
- [x] Async callback configuration is awaited, receives the original optional Request, and retains every valid returned origin.
- [x] Initialization and direct `auth.api` calls work when Better Auth invokes trusted-origin resolution without a Request.
- [x] Production returns the original `trustedOrigins` value or callback unchanged and never adds a request-derived origin.
- [x] Both singleton modes are covered, and the helper neither replaces `allowedHosts` nor enables trusted proxy headers.

## Answer

Added a development-only trusted-origins wrapper shared by both singleton modes. It preserves user arrays and async callbacks, forwards the original optional Request, and merges valid configured origins with normalized localhost, the actual Nitro development origin, and the current Better Auth Request origin. Empty values and duplicates are removed.

Production and `autoBaseURL: false` return the original trusted-origins value or callback by identity. Dynamic allowedHosts and advanced trusted-proxy configuration remain untouched. Tests cover arrays, callbacks, undefined Requests used by initialization and direct `auth.api`, runtime integration, production, opt-out, and native option references; the README documents the behavior.
