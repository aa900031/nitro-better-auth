# 04: Isolate resolved origins across singleton lifecycles

**What to build:** Apply the same canonical URL and option-resolution behavior to both supported singleton modes without allowing one development request origin to contaminate another. Request singletons must remain request-scoped. App singletons may reuse instances only when their resolved initialization context is equivalent, and `useBetterAuth(event)` versus eventless access must have an explicit, testable meaning.

**Blocked by:** 01: Resolve the canonical auth URL for the app singleton.

**Status:** resolved

- [x] Request singleton mode creates at most one resolved Better Auth instance per request and never reuses it for another request.
- [x] App singleton mode does not reuse an instance initialized for one inferred development origin when a request resolves to a different origin.
- [x] Stable explicit and environment-derived canonical URLs continue to reuse an app-level instance.
- [x] Event-aware and eventless `useBetterAuth` calls have documented behavior for each singleton mode, including calls made directly through `auth.api`.
- [x] Better Auth's native `allowedHosts` mode does not force request singleton mode.
- [x] Tests cover different hosts and ports, repeated access within one request, both singleton modes, and the existing async-context behavior.

## Answer

Both singleton modes now share one runtime options resolver. App singleton instances use a stable app entry for explicit, environment-derived, eventless, and native `allowedHosts` configurations, while inferred development request URLs are cached by their complete resolved endpoint. Request singleton instances use a WeakMap and are created once per event.

App-mode `useBetterAuth(event)` now selects the event's resolved instance; eventless access uses the stable configured/environment instance or development fallback. Request mode continues to require an event unless Nitro async context is enabled. Tests cover distinct hosts and ports, repeated cache access, separate requests, allowedHosts, environment stability, and both async-context module branches. Live development smoke tests exercised two request hosts plus eventless direct `auth.api` access.
