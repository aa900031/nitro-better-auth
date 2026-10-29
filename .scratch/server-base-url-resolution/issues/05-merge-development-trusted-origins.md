# 05: Merge development trusted origins safely

**What to build:** In development only, enhance the user's Better Auth trusted origins with the inferred localhost origin, Nitro development origin, and the current auth Request origin. Preserve both array and async callback configuration forms, including their request argument and undefined-request behavior, while filtering unusable entries and removing duplicates. Production must pass the user's configuration through unchanged.

**Blocked by:** 03: Resolve development and deployment runtime URLs; 04: Isolate resolved origins across singleton lifecycles.

**Status:** ready-for-agent

- [ ] Development merges configured origins with normalized localhost, Nitro development, and current Request origins without duplicates or empty values.
- [ ] Array configuration retains every valid user origin and can include the current Request origin when Better Auth invokes it.
- [ ] Async callback configuration is awaited, receives the original optional Request, and retains every valid returned origin.
- [ ] Initialization and direct `auth.api` calls work when Better Auth invokes trusted-origin resolution without a Request.
- [ ] Production returns the original `trustedOrigins` value or callback unchanged and never adds a request-derived origin.
- [ ] Both singleton modes are covered, and the helper neither replaces `allowedHosts` nor enables trusted proxy headers.
