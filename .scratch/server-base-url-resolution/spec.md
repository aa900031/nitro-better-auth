# Server Base URL Automatic Resolution — Technical Specification

> Tracker scope: this repository currently tracks only the `nitro-better-auth`
> work in tickets 01–05. The `nuxt-better-auth` client and Nuxt compatibility
> work described below is retained for cross-repository context but is not part
> of this ticket set.

**Status:** Draft
**Version:** 0.2.0
**Target repositories:**

- [aa900031/nitro-better-auth](https://github.com/aa900031/nitro-better-auth)
- [aa900031/nuxt-better-auth](https://github.com/aa900031/nuxt-better-auth)

**Reference implementation:** [@nuxtjs/better-auth](https://github.com/nuxt-modules/better-auth)

**Target compatibility:** Nuxt 3、Nuxt 4、Nitro 2.x、Better Auth 1.x

---

## 1. Overview

為 `nitro-better-auth` 與 `nuxt-better-auth` 加入自動解析 Server Base URL 的能力。

整體行為應盡可能接近 `@nuxtjs/better-auth`：

1. 優先使用明確設定的 canonical site URL。
2. Development 可以根據 request origin 與 Nitro 開發環境推導。
3. Production 只使用明確設定或可信部署環境提供的 URL。
4. Production 不使用 request Host 或 forwarded headers 自動推導 canonical URL。
5. Nuxt `app.baseURL` 必須正確反映在 Better Auth endpoint。
6. Server 與 Client 使用一致的 URL 解析規則。
7. 開發環境可以自動補足 `trustedOrigins`。

本次不要求維持目前 `nuxt-better-auth` 透過 `useRequestURL().origin` 建立 Client Base URL 的既有演算法。

現有程式碼可以重構或替換，只需維持公開 API 相容性。

### 與社群版的必要差異

目前 `@nuxtjs/better-auth` 由 module 接管 Server Base URL；本專案的 `server-options.ts` 原本就允許直接提供完整的 Better Auth options。

因此本專案仍需：

- 保留使用者明確提供的 `baseURL`。
- 保留 Better Auth 原生 `baseURL.allowedHosts`。
- 支援自訂 `handlerPath`。
- 支援 `singleton: 'app'` 與 `singleton: 'request'`。
- 支援 standalone Nitro，不要求安裝 Nuxt。

除此之外，應優先沿用社群版的行為與安全設計。

---

## 2. Goals

### G-01 — Zero configuration in development

使用者在一般 Nuxt / Nitro 開發環境下，不設定 Server Base URL 也能正常使用 Better Auth。

### G-02 — Canonical site URL

提供明確且可預測的 canonical URL 優先權，避免多個環境變數與 request headers 互相競爭。

### G-03 — Consistent Client and Server URLs

Client auth endpoint 必須與 Server 真正掛載的 Better Auth endpoint 一致。

### G-04 — Nuxt Base Path integration

Nuxt 3、Nuxt 4 的 `app.baseURL` 不需要由 `nuxt-better-auth` 重複傳入 Nitro。

### G-05 — Production security

Production 不可因為任意 Host 或 `X-Forwarded-Host` 而變更 OAuth callback、認證連結或 canonical URL。

### G-06 — Preserve native Better Auth features

不得破壞 Better Auth 原生的：

- `baseURL`
- `baseURL.allowedHosts`
- `basePath`
- `trustedOrigins`
- `advanced.trustedProxyHeaders`

---

## 3. Configuration Design

### 3.1 Nitro module options

保留既有設定，新增選用的開關：

```ts
export interface ModuleOptions {
	singleton?: 'app' | 'request'
	handlerPath?: string
	options?: {
		path: string
	}

	/** Enable automatic Server Base URL and Base Path resolution. @default true */
	autoBaseURL?: boolean
}
```

預設：

```ts
export default defineNitroConfig({
	modules: ['nitro-better-auth'],
})
```

不需要額外設定 `baseURL`。

可以關閉：

```ts
export default defineNitroConfig({
	modules: ['nitro-better-auth'],
	betterAuth: {
		autoBaseURL: false,
	},
})
```

當 `autoBaseURL` 為 `false` 時，不執行自動 Server Base URL、Base Path 與 development trusted origins 補足。

### 3.2 Canonical site URL

採用與 `@nuxtjs/better-auth` 一致的設定名稱：

```ts
export default defineNuxtConfig({
	runtimeConfig: {
		public: {
			siteUrl: '',
		},
	},
})
```

Production 可使用：

```env
NUXT_PUBLIC_SITE_URL=https://example.com
```

`siteUrl` 代表網站公開 origin，不是 Better Auth API 的完整路徑。

例如：

```text
siteUrl              https://example.com
Nuxt app.baseURL     /dashboard/
Auth endpoint        /api/auth
```

最終公開 auth endpoint：

```text
https://example.com/dashboard/api/auth
```

`nuxt-better-auth` 應確保 `runtimeConfig.public.siteUrl` 有預設宣告，使 Nuxt 能在 runtime 使用 `NUXT_PUBLIC_SITE_URL` 覆寫。

不得覆寫使用者或其他 module 已提供的 `siteUrl` 值。

Standalone Nitro 則允許從既有 runtime config 或環境變數讀取 site URL。

---

## 4. Server Origin Resolution

### FR-001 — Reference algorithm

Server URL resolver 應以社群版的 `getBaseURL()` 為參考。

自動解析優先順序：

| Priority | Source | Environment |
|---|---|---|
| 1 | 明確設定的 `server-options.ts` `baseURL` | All |
| 2 | `runtimeConfig.public.siteUrl` / `NUXT_PUBLIC_SITE_URL` | All |
| 3 | `BETTER_AUTH_URL` | All |
| 4 | Request origin | Development only |
| 5 | Nitro development environment | Development only |
| 6 | `VERCEL_URL`、`CF_PAGES_URL`、Netlify `URL` | All |
| 7 | `http://localhost:3000` | Development only |
| 8 | Throw configuration error | Production |

第 1、3 項是本專案為保留既有 Better Auth 設定能力而增加的相容規則。其餘解析策略以 `@nuxtjs/better-auth` 為準。

如果存在明確的 `baseURL`，不得再使用其他來源覆寫。

若 `BETTER_AUTH_URL` 包含 pathname，需遵守 Better Auth 將其視為完整 auth endpoint path 的語意。

### FR-002 — Configured site URL

當 `runtimeConfig.public.siteUrl` 有合法值時應直接使用其 origin；即使 request 帶有不同的 Host，也不能因此改變結果。設定值必須先進行驗證。

### FR-003 — URL validation

參考社群版的 `validateURL()` 實作。只接受 `http:` 與 `https:`。

必須拒絕：

- 非法 URL。
- 非 HTTP(S) scheme。
- 包含 username 或 password 的 URL。
- 含有危險前置空白或控制字元的值。

接受的 site URL 應正規化為 origin。明確設定無效時應直接報錯，不得默默改用其他來源。

### FR-004 — Development request origin

僅限 development 使用 request origin，並參考社群版使用 forwarded host/protocol 的方式取得 origin。推導結果仍須通過 URL validation。Production 必須跳過此步驟。

### FR-005 — Nitro development environment

當沒有 request origin 時，參考社群版的 Nitro 環境推導。

支援：

- Nuxt development proxy URL。
- Nitro development host / port。
- Nitro development HTTPS certificate / key。
- 可確認的 Nuxt Vite development URL。
- `localhost:3000` fallback。

開發環境的 `127.0.0.1`、`::1` 等 loopback hostname 可以正規化為 `localhost`，以接近社群版行為。

### FR-006 — Deployment environment variables

支援：

| Environment | Source |
|---|---|
| Vercel | `VERCEL_URL` |
| Cloudflare Pages | `CF_PAGES_URL` |
| Netlify | `URL` |

必須正規化並驗證 URL。

對自行架設的 VPS、自訂 domain 與 Cloudflare Workers，優先要求設定 `NUXT_PUBLIC_SITE_URL`。

不得因為 server listener 綁定 `0.0.0.0` 或內部 IP，就推導出對外使用的 canonical URL。

### FR-007 — Production behavior

Production 中沒有 configured site URL、`BETTER_AUTH_URL`、supported platform URL 或 explicit Better Auth `baseURL` 時，應拋出類似：

```text
[nitro-better-auth] siteUrl required in production.

Set NUXT_PUBLIC_SITE_URL to your public application URL,
or provide a supported deployment platform URL.
```

不得使用 `Host`、`X-Forwarded-Host`、`X-Forwarded-Proto`、`NITRO_HOST`、`HOST` 或任意 request URL 自動建立固定 canonical URL。

### FR-008 — Development diagnostics

如果 development 使用推導出的 URL，應只記錄一次 warning：

```text
[nitro-better-auth] Using inferred baseURL
"http://localhost:3000" from development environment.

Set NUXT_PUBLIC_SITE_URL for deterministic OAuth callbacks.
```

如果已提供明確 site URL，則不應輸出該 warning。

---

## 5. Base Path Resolution

### FR-009 — Read Nitro baseURL directly

在 Nitro module setup 階段讀取 `nitro.options.baseURL || '/'`。Nuxt 3、Nuxt 4 都會將 `app.baseURL` 傳入 Nitro，因此不需要額外設定。

### FR-010 — Resolve auth handler path

預設 `handlerPath: '/api/auth/**'` 推導為 `/api/auth`；自訂 `/auth/**` 推導為 `/auth`。只對可以明確轉換為單一 endpoint 的 handler pattern 進行自動推導。

### FR-011 — Resolve public auth path

`effectiveAuthPath` 為 Nitro base path 與 handler base path 的 URL join。

| Nitro baseURL | handlerPath | effectiveAuthPath |
|---|---|---|
| `/` | `/api/auth/**` | `/api/auth` |
| `/dashboard/` | `/api/auth/**` | `/dashboard/api/auth` |
| `/app/` | `/auth/**` | `/app/auth` |
| `/a/b/` | `/api/auth/**` | `/a/b/api/auth` |

### FR-012 — Mirror community Base URL semantics

社群版目前的規則：根路徑 `/` 預設返回 origin；非根路徑返回包含完整 auth endpoint 的 absolute URL。本專案需額外支援自訂 `handlerPath`。

```ts
function resolveAuthBaseURL(
	siteUrl: string,
	nitroBasePath: string,
	handlerBasePath: string,
): string {
	const origin = new URL(siteUrl).origin

	if (
		nitroBasePath === '/'
		&& handlerBasePath === '/api/auth'
	) {
		return origin
	}

	return joinURL(origin, nitroBasePath, handlerBasePath)
}
```

Better Auth 會將 `baseURL` 裡的 pathname 視為完整 endpoint path，不能再重複拼接。

### FR-013 — Nitro route registration unchanged

仍然維持以 `options.handlerPath` 註冊 handler，由 Nitro 自己負責套用 routing prefix。不得把 `nitroBasePath` 再手動拼入 route。

---

## 6. Better Auth Options Resolution

### FR-014 — Automatic options

在使用者沒有明確設定 Server Base URL 時，載入使用者 options 並注入 resolved `baseURL`。不能只依賴 Better Auth 自行從 request 推導 Base URL 的 fallback。

### FR-015 — Respect explicit configuration

使用者原本的明確 `baseURL` 必須保留。但如果 URL 未包含 pathname，而 Nitro 有額外 routing prefix，應以明確、可測試的規則補足缺少的 `basePath`。若 `baseURL` 已包含 pathname，則不得再自動修改其 endpoint path。

### FR-016 — Native allowedHosts

Better Auth object `baseURL` 的 `allowedHosts` 與 `protocol` 必須原樣保留，不應改成固定字串 URL。動態模式交由支援此功能的 Better Auth 版本處理。若搭配 Nitro 非根路徑，應使用有效的 Better Auth `basePath` 並確認與 handler 一致。不自行實作 hostname allowlist，也不自動啟用 `advanced.trustedProxyHeaders`。

### FR-017 — Explicit basePath

使用者明確提供的 `basePath` 不得被自動覆寫。若與實際掛載路徑不符，development 應輸出診斷 warning，文件需說明正確設定方式。

### FR-018 — Better Auth version compatibility

目前 peer dependency 支援 `^1.2.0`。自動 Base URL 功能不得強迫所有使用者升級到支援 `allowedHosts` 的較新版本；動態 Base URL 測試應在支援該選項的版本執行。

---

## 7. Development trustedOrigins

這部分應直接參考 `@nuxtjs/better-auth` 的 `withDevTrustedOrigins()`。

### FR-019 — Production unchanged

Production 應將使用者設定的 `trustedOrigins` 原樣交給 Better Auth，不得自行加入 request origin。

### FR-020 — Development enhancement

Development 可以加入推導出的 localhost origin、Nitro development origin 與目前 auth Request URL 的 origin。

### FR-021 — Support both configuration forms

必須支援 array 與 async callback。原始 callback 必須保留 request parameter。合併時應執行原有設定、加入 development origins、過濾空值、去除重複並返回新清單。Better Auth 在初始化與直接呼叫 `auth.api` 時可能沒有 Request，所以 callback 必須處理 `request === undefined`。

### FR-022 — Security boundary

Development trusted origins enhancement 不得啟用於 production。`allowedHosts` 的安全機制不能被這層 helper 取代。

---

## 8. Nuxt Client Base URL

這部分不再以目前的 `useRequestURL().origin` 實作為基礎，應參考社群版 `useAuthClient`。

### FR-023 — Resolve site URL

新的 Client 預設 URL 先讀 `runtimeConfig.public.siteUrl`，再以 `useRequestURL().origin` fallback。Server canonical URL 仍應以 Server resolver 為準。

### FR-024 — Apply Nuxt app.baseURL

Client Base URL 必須使用與 Server 相同的 endpoint path 規則，套用 site URL、`runtimeConfig.app.baseURL` 與 handler base path。自訂 `handlerPath` 時 Client 必須使用對應 endpoint。

### FR-025 — Explicit client baseURL

使用者在 client options 中明確設定的 `baseURL` 仍應優先採用，不得自動覆寫。

### FR-026 — Shared URL logic

`nuxt-better-auth` 不應另寫一套不同的 path resolver。純 URL/path 函式應由 `nitro-better-auth` 提供可重用的內部 utility 或公開子路徑。Nuxt wrapper 只提供 `siteUrl`、`app.baseURL` 與 client options，不重複實作 Server environment detection。

---

## 9. Instance Lifecycle

### FR-027 — App singleton

保留 `singleton: 'app'`。Server Base URL 來自明確設定或環境變數時可沿用單一 app instance。Development 對不同 request origins 建立不同 auth instances 時，應參考社群版按 origin 快取策略，避免第一個 request 的 host 污染後續 request。需定義 `useBetterAuth(event)` 與 eventless 呼叫的 context。

### FR-028 — Request singleton

保留 `singleton: 'request'`，每個 request 建立 instance 的設計不變，並使用相同 URL resolver。

### FR-029 — No singleton changes for allowedHosts

使用 Better Auth 原生 `allowedHosts` 不應強制切換成 request singleton；應讓 Better Auth 核心根據每個 request 解析允許的 hostname。

---

## 10. Runtime Configuration

### FR-030 — Build-time and runtime separation

`nitro-better-auth` 必須區分 module setup 階段的 routing configuration、runtime 階段的 canonical site URL，以及 request 階段的 development origin。公開 origin 應在 runtime 才解析。

### FR-031 — Nuxt app.baseURL

Nuxt 3 / 4 已將 `app.baseURL` 傳遞到 `nitro.options.baseURL` 與 `nitro.runtimeConfig.app.baseURL`，因此不新增 Nuxt → Nitro 路徑傳遞設定。

### FR-032 — Runtime baseURL override

如果 `NUXT_APP_BASE_URL` 在 runtime 覆寫路徑，不能假設 Nitro 路由已自動重新掛載。本次以 Nitro 真正可服務的路由為準。Nuxt 4 runtime-relocatable routing 模式需獨立測試；未驗證前不宣稱所有模式皆受支援。

---

## 11. Implementation Plan

### Repository A — nitro-better-auth

1. 新增 Server origin、URL validation、auth base path 與 development trusted origins resolver。
2. Module setup 讀取 Nitro base path 與 handler path，產生 runtime 路徑設定，不重複加入 route prefix。
3. App singleton 載入並合併使用者 options，避免不同 request origins 污染 cache。
4. Request singleton 使用相同 resolver。
5. 補上 development、production、validation、singleton、allowedHosts、custom handler tests 與文件。

### Repository B — nuxt-better-auth

1. 確保 `runtimeConfig.public.siteUrl` 有不覆寫既有值的預設。
2. Client 改為 configured site URL → request origin fallback → app base path → handler path。
3. 重用 Nitro path resolver。
4. 驗證 Nuxt 3、Nuxt 4、root、subpath、custom handler、SSR 與 browser。

---

## 12. Acceptance Criteria

- **AC-01:** 一般 Nitro / Nuxt development 未設定 URL 時仍可啟動並使用 auth endpoint。
- **AC-02:** `NUXT_PUBLIC_SITE_URL` 優先於 request Host。
- **AC-03:** Production 沒有合法 site/platform URL 時報錯，不使用 request Host。
- **AC-04:** Nuxt `app.baseURL: '/dashboard/'` 使 endpoint 為 `/dashboard/api/auth`。
- **AC-05:** Custom handler `/account/auth/**` 搭配 `/dashboard/` 得到 `/dashboard/account/auth`。
- **AC-06:** 已設定 site URL 時 SSR Client、Browser Client 與 Server endpoint 一致。
- **AC-07:** Development 自動補足 localhost 與必要 request origins。
- **AC-08:** Production 不自動加入任意 request origin。
- **AC-09:** 不覆寫明確的 `baseURL`、`basePath`、`trustedOrigins` 或 `advanced.trustedProxyHeaders`。
- **AC-10:** 支援版本中的原生 `allowedHosts` 正常運作。
- **AC-11:** 兩種 singleton 均正常，且不同 request origins 不互相污染。
- **AC-12:** Build 無 URL、runtime 才提供平台環境變數時仍可解析。
- **AC-13:** `autoBaseURL: false` 不注入或修改 URL-related options。

---

## 13. Test Matrix

| Scenario | Expected |
|---|---|
| Development，沒有設定 URL | 推導 development origin |
| Development，明確 siteUrl | siteUrl 優先 |
| Development，不同 localhost port | 使用實際 port |
| Production，明確 siteUrl | 正確初始化 |
| Production，Vercel | 使用有效的 `VERCEL_URL` |
| Production，Cloudflare Pages | 使用有效的 `CF_PAGES_URL` |
| Production，Netlify | 使用有效的 `URL` |
| Production，無 URL | 拋出明確錯誤 |
| Production，偽造 Host 或 forwarded host | 不影響 canonical URL |
| URL 有不安全 scheme / credentials | 拒絕 |
| Nuxt `app.baseURL: '/'` | 預設 `/api/auth` |
| Nuxt `app.baseURL: '/app/'` | `/app/api/auth` |
| Custom handlerPath | Endpoint 正確 |
| 明確 Better Auth `baseURL` | 不覆寫 |
| 明確 Better Auth `basePath` | 不覆寫 |
| Better Auth `allowedHosts` | 原生功能正常 |
| Development trustedOrigins array | 正確合併與去重 |
| Development trustedOrigins callback | 保留 callback 語意 |
| Production trustedOrigins callback | 原樣保留 |
| App singleton | 不發生 URL 污染 |
| Request singleton | 每個 request 使用正確 URL |
| Nuxt 3 SSR + Browser | Client/Server URL 一致 |
| Nuxt 4 SSR + Browser | Client/Server URL 一致 |

---

## 14. Out of Scope

本次不實作：

- 自製 Better Auth hostname allowlist。
- OAuth provider callback registration automation。
- 任意 multi-tenant routing。
- Client-only external backend mode。
- Session serialization 或 cookie forwarding 改進。
- Secret management 改進。
- Route protection / RBAC。
- Nuxt DevTools integration。

---

## 15. Definition of Done

- [ ] Server Base URL resolver 與社群版主要策略一致。
- [ ] 支援 `NUXT_PUBLIC_SITE_URL`。
- [ ] Development 可以自動推導 URL。
- [ ] Production 不信任 request Host。
- [ ] 支援 Vercel、Cloudflare Pages、Netlify URL。
- [ ] URL validation 與明確錯誤訊息完整。
- [ ] Nitro baseURL 與 custom handlerPath 正確組合。
- [ ] Nuxt 3 / Nuxt 4 不需額外傳遞 `app.baseURL`。
- [ ] Client URL resolver 改為 siteUrl-first。
- [ ] Development trustedOrigins 正確補足。
- [ ] 原有 Better Auth options 不被覆寫。
- [ ] 原生 allowedHosts 正常運作。
- [ ] App/request singleton 通過測試。
- [ ] 補齊文件、單元測試與 E2E 測試。

---

## 16. References

### Community implementation

- [Server auth URL resolution](https://github.com/nuxt-modules/better-auth/blob/main/src/runtime/server/utils/auth.ts)
- [resolveAuthBaseURL](https://github.com/nuxt-modules/better-auth/blob/main/src/runtime/internal/auth-base-url.ts)
- [useAuthClient](https://github.com/nuxt-modules/better-auth/blob/main/src/runtime/app/composables/useAuthClient.ts)
- [Configuration documentation](https://github.com/nuxt-modules/better-auth/blob/main/docs/content/1.getting-started/2.configuration.md)
- [Base URL tests](https://github.com/nuxt-modules/better-auth/blob/main/test/get-base-url.test.ts)

### Nuxt source

- [Nuxt 3.20.0 Nitro setup](https://github.com/nuxt/nuxt/blob/v3.20.0/packages/nitro-server/src/index.ts)
- [Nuxt 4.6.2 Nitro setup](https://github.com/nuxt/nuxt/blob/v4.6.2/packages/nitro-server/src/index.ts)

### Better Auth

- [Better Auth options](https://better-auth.com/docs/reference/options)
- [Dynamic Base URL](https://better-auth.com/docs/guides/dynamic-base-url)
- [Better Auth security](https://better-auth.com/docs/reference/security)
