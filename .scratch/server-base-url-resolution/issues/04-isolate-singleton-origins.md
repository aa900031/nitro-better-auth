# 04: Isolate resolved origins across singleton lifecycles

**What to build:** Apply the same canonical URL and option-resolution behavior to both supported singleton modes without allowing one development request origin to contaminate another. Request singletons must remain request-scoped. App singletons may reuse instances only when their resolved initialization context is equivalent, and `useBetterAuth(event)` versus eventless access must have an explicit, testable meaning.

**Blocked by:** 01: Resolve the canonical auth URL for the app singleton.

**Status:** ready-for-agent

- [ ] Request singleton mode creates at most one resolved Better Auth instance per request and never reuses it for another request.
- [ ] App singleton mode does not reuse an instance initialized for one inferred development origin when a request resolves to a different origin.
- [ ] Stable explicit and environment-derived canonical URLs continue to reuse an app-level instance.
- [ ] Event-aware and eventless `useBetterAuth` calls have documented behavior for each singleton mode, including calls made directly through `auth.api`.
- [ ] Better Auth's native `allowedHosts` mode does not force request singleton mode.
- [ ] Tests cover different hosts and ports, repeated access within one request, both singleton modes, and the existing async-context behavior.
