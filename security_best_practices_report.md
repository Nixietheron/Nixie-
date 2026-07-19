# Nixie Security & Launch Readiness Review

Date: 2026-07-19
Scope: Next.js application, wallet/SIWE authentication, admin and Pinata flows, NFT quote service, `NixieGenesis` ERC-1155 contract, dependencies, production build, deployment state.

## Executive summary

The ERC-1155 contract's core supply, payment, quote replay, per-address mint cap, and royalty logic is coherent, and all current Foundry tests pass. The Next.js production build also completes. No private key or secret value was found in tracked project files or the inspected Git history.

The original review found the system was not ready for unrestricted public launch. The critical same-origin IPFS issue, museum media authorization mismatch, fail-open admin configuration, SIWE domain handling, upload validation, CSP/security headers, and the high-severity dependency advisory have now been remediated in the working tree. Contract ownership remaining on the current EOA is an explicit owner-accepted risk. The final collection JSON is pinned and active on-chain, and all 20 token metadata URIs are permanently frozen.

## Remediation status (2026-07-19)

- **Fixed:** arbitrary same-origin CID proxying; active MIME serving; museum-holder authorization for all protected media; fail-open admin access; SIWE domain mismatch; upload size/type/name controls; CSP and baseline headers.
- **Hardened:** isolated signer verification, owner/treasury signer separation, price-movement circuit breaker, economic quote floor, upstream timeouts and sanitized public errors.
- **Dependency result:** reduced from 1 high + 28 moderate to **0 high + 9 moderate** without a breaking Wagmi major migration.
- **Final metadata pinned:** `ipfs://QmfGCckYg5EYoi71iLE5PpQHXqJvYa6berMauYSGvmxByY`.
- **Final URI active and token metadata frozen:** URI transaction `0x0f5b6b3e28e43e03776c70f0dcbe4c8fc998bccff7e87d6fdc321267146e190a`; freeze transaction `0x4f9305386843e159f3fe2c3345758a7e566ad1b859ee5e90f1957ad965c21587`.
- **Accepted by owner:** no multisig migration at this stage.

## Critical findings

### 1. Arbitrary IPFS content can execute under the application origin

- Severity: **Critical**
- Location: `app/api/ipfs-image/route.ts:14-26`, `app/api/ipfs-image/route.ts:48-72`
- Evidence: The public `cid` parameter accepts any alphanumeric CID, fetches that object from Pinata, reflects the upstream `Content-Type`, and returns its bytes from the Nixie application origin. There is no authentication, CID allowlist, safe MIME allowlist, `nosniff`, or attachment disposition.
- Impact: An attacker can pin HTML, SVG, or another active format and send a victim a Nixie URL containing that CID. If navigated to, the content can run as the Nixie origin. A logged-in admin's HttpOnly cookies cannot be read directly, but attacker JavaScript can issue same-origin admin requests with those cookies and change application state.
- Required fix:
  1. Remove the arbitrary public `cid` branch or allow only CIDs already approved in the database.
  2. Permit only decoded/verified safe raster and expected video formats; reject HTML, SVG, XML, JavaScript, and ambiguous types.
  3. Add `X-Content-Type-Options: nosniff` and use `Content-Disposition: attachment` for anything not explicitly safe for inline display.
  4. Keep protected content behind the authenticated `contentId` lookup and apply the same MIME validation there.
- Temporary mitigation: Disable `/api/ipfs-image?cid=...` at the edge until the route is fixed.
- False-positive qualification: This becomes exploitable when a victim opens the crafted same-origin URL. It does not require the attacker's CID to exist in the Nixie database.

## High findings

### 2. Admin authorization fails open when `ADMIN_EMAIL` is missing

- Severity: **High**
- Location: `lib/auth-admin.ts:4-14`, `app/api/upload/route.ts:5-15`
- Evidence: The condition rejects a mismatched email only when `ADMIN_EMAIL` is truthy. If the environment variable is absent or empty, every authenticated Supabase user passes the admin check.
- Impact: A production environment mistake can grant any registered user full admin API and upload privileges.
- Required fix: Treat a missing/invalid `ADMIN_EMAIL` as a server configuration failure and deny all access. Prefer a stable Supabase user UUID or explicit role/allowlist rather than email alone. Centralize the check so upload does not duplicate authorization logic.
- Current-state note: The inspected local production configuration has the key present; the code is still not secure by default.

### 3. A compromised quote signer can sell the entire remaining supply for almost zero NIX

- Severity: **High**
- Location: `app/api/nft/quote/route.ts:58-98`, `contracts/NixieGenesis.sol:96-123`
- Evidence: The server stores `NIXIE_PRICE_SIGNER_PRIVATE_KEY`. On-chain, any correctly signed quote is accepted as long as `nixAmount` is greater than zero; there is no on-chain economic floor.
- Impact: Server or environment compromise lets an attacker issue one-wei quotes and use multiple wallets to drain the remaining collection. The three-mint cap is per address and does not stop a multi-wallet drain.
- Required fix: Put the signer in a hardened secret store, rotate it after any suspected exposure, restrict production access, alert on unusual quote values/mint velocity, and provide an emergency auto-pause path. Consider an owner-adjustable on-chain minimum NIX amount per NFT or a second independent authorization control.
- Mitigation already present: Quotes are buyer-bound, short-lived, one-time, and the owner can rotate the signer or pause the sale.

### 4. Contract administration is controlled by one EOA

- Severity: **High (operational key risk)**
- Location: `contracts/NixieGenesis.sol:144-188`, `deployments/robinhood-mainnet.json:9-12`
- Evidence: The on-chain owner is `0x9b67F3835826192852D16373fE18Cef20381fb19`. It can change treasury, quote signer and metadata, and pause the contract. The key has also been used as a normal deployer wallet.
- Impact: Loss, malware, phishing, or theft of one key can redirect future NIX payments, replace metadata, or disable sales.
- Required fix: Transfer ownership to a tested multisig/hardware-backed setup (for example 2-of-3 if supported on Robinhood Chain). Keep the quote signer separate from owner and treasury keys. Perform a test transaction before transferring ownership.
- False-positive qualification: No evidence of current key leakage was found; this is a concentration-of-control risk.

### 5. Production dependency tree contains known advisories

- Severity: **High**
- Location: `package.json:14-30`, `package-lock.json`
- Evidence: `npm audit --omit=dev` reports **1 high and 28 moderate** production vulnerabilities. The high advisory is a transitive `ws` memory-exhaustion DoS; affected chains include `viem`, WalletConnect/Reown, Wagmi and wallet SDK packages. A nested PostCSS version under Next.js is also flagged, along with additional WalletConnect/MetaMask/UUID advisories.
- Impact: Actual reachability varies, but wallet connectivity and server/client bundles contain vulnerable versions; the `ws` issue can affect availability where an affected WebSocket server path is reachable.
- Required fix: Upgrade in a compatibility branch, beginning with patched `viem`/Wagmi/WalletConnect-compatible versions, then rerun wallet, SIWE, approve, mint, and mobile tests. Do **not** run `npm audit fix --force` directly on production because the proposed remediation includes major-version changes.
- Mitigation: Keep lockfile-based `npm ci`, minimize enabled wallet connectors, and monitor advisories until the migration is deployed.

## Medium findings

### 6. SIWE domain mismatch is logged but accepted

- Severity: **Medium**
- Location: `app/api/auth/evm/route.ts:52-63`, `lib/auth-hosts.ts:11-47`
- Evidence: A domain outside the trusted set only produces a warning, after which nonce and signature verification continue. The trusted set also includes request-derived forwarded/host headers.
- Impact: This weakens SIWE's domain-binding/phishing protection and makes proxy configuration part of the trust boundary.
- Required fix: Reject mismatches with 401. Build the production allowlist only from canonical configured application origins; add explicit localhost values only in development. Trust forwarded host headers only behind a proxy that overwrites them.
- Mitigation already present: Nonce, signature, chain ID, session signing, HttpOnly cookie settings, and replay resistance are otherwise implemented.

### 7. Uploads have no size/content validation and “private” media is pinned publicly

- Severity: **Medium**
- Location: `app/api/upload/route.ts:17-35`, `lib/pinata.ts`
- Evidence: The endpoint accepts any `File`, preserves its supplied filename, and has no byte limit, MIME allowlist, magic-byte check, or fetch timeout. The code explicitly pins all SFW/NSFW/animated assets publicly and relies on the UI for visibility.
- Impact: Accidental or malicious admin uploads can create storage/cost pressure and introduce active content. Public IPFS content is retrievable by anyone who obtains/discovers its CID; blur or UI gating is not cryptographic access control.
- Required fix: Add per-type byte limits, magic-byte validation, safe extension/MIME allowlists, randomized server filenames, request/upstream timeouts, and generic client errors. If museum assets must truly be exclusive, encrypt them or use authenticated private storage rather than public IPFS.

### 8. Baseline browser security headers and CSP are missing

- Severity: **Medium**
- Location: `next.config.mjs:8-17`
- Evidence: Only COOP and COEP are set. There is no Content Security Policy, `X-Content-Type-Options`, clickjacking control, `Referrer-Policy`, or `Permissions-Policy`.
- Impact: Any script/content injection has a larger blast radius; the site can also be framed for wallet-transaction social engineering.
- Required fix: Add `nosniff`, `frame-ancestors 'none'` (and/or `X-Frame-Options: DENY`), `strict-origin-when-cross-origin`, and a narrow permissions policy. Roll out a nonce/hash-based CSP in report-only mode first, capturing the exact RainbowKit, WalletConnect, RPC, Supabase and Pinata requirements before enforcing it.

### 9. Spot-price quotes and in-memory rate limiting are manipulable/fragile

- Severity: **Medium (economic and availability risk)**
- Location: `app/api/nft/quote/route.ts:18-38`, `app/api/nft/quote/route.ts:66-89`
- Evidence: Pricing uses a single Dexscreener spot price. Liquidity and maximum-price checks exist, but there is no TWAP/deviation check. Rate limiting is an in-memory map keyed from `x-forwarded-for`, so it is not shared across serverless instances and depends on trusted proxy behavior.
- Impact: A temporary spot-price increase below the configured ceiling can lower the NIX payment for a $5 mint. Distributed callers can bypass the process-local limiter and create API/RPC/price-source load.
- Required fix: Add a short cached median/deviation rule or TWAP-like safety check, conservative circuit breaker, distributed edge rate limit keyed by canonical IP plus wallet, and upstream timeouts. Return generic public errors while logging details server-side.
- Mitigation already present: Minimum-liquidity and maximum-price guards are correctly implemented.

### 10. Production metadata handoff is incomplete

- Severity: **Medium (integrity/launch readiness)**
- Location: `deployments/robinhood-mainnet.json:13-18`, `contracts/NixieGenesis.sol:162-180`
- Evidence: The final on-chain `contractURI` is active, OpenSea presents the final collection name and banner, all 20 token URIs exist, and `tokenMetadataFrozen` is true.
- Impact: OpenSea can show stale branding/link data, and a compromised owner can still replace token artwork/metadata.
- Status: Completed. OpenSea was inspected and `freezeTokenMetadata()` was executed successfully.
- Warning: Token metadata freeze is irreversible. Do it only after final visual and CID verification. ERC-2981 reports 5%, but marketplace payment/enforcement can still depend on marketplace policy.

## Low findings

### 11. Contract tests and frontend lint coverage leave important cases unverified

- Severity: **Low**
- Location: `test/NixieGenesis.t.sol`, current ESLint output
- Evidence: Three Foundry tests pass, including exact 50-per-character distribution. Missing dedicated cases include invalid/expired/wrong-buyer signatures, quote replay, owner-only setters, pause, sold-out behavior, royalty/treasury changes, and freeze irreversibility. ESLint also reports two missing React hook dependencies and several raw-image warnings.
- Impact: Regressions around authorization and UI state can pass the current suite.
- Required fix: Add negative-path contract tests and API tests for quote/auth/upload routes. Resolve the hook dependency warnings; assess image warnings separately based on IPFS behavior and optimization needs.

## Known design limitations (accepted or to disclose)

1. **Randomness is pseudo-random, not provably random.** `contracts/NixieGenesis.sol:190-195` uses block values, buyer, nonce and supply. It preserves the 50-copy pool but validators/order and multi-wallet retry strategies can influence outcomes. Do not advertise “provably random.”
2. **Three per wallet is not three per person.** Users can create multiple addresses. This is a distribution-policy limitation, not a contract bypass.
3. **Public IPFS is permanent/discoverable.** Anything pinned publicly should be treated as public even if the application hides the CID.

## Positive controls verified

- ERC-1155 supply is fixed at 20 token types × 50 editions; the pool removes drawn entries.
- NIX transfers go directly to the configured treasury via `SafeERC20`.
- Mint uses `nonReentrant`, pause controls, buyer-bound EIP-712 quotes, deadlines and quote replay tracking.
- ERC-2981 default royalty is 5% and points to the treasury.
- All 20 images and IPFS manifest entries are present.
- `forge fmt --check` passes; 3/3 Foundry tests pass.
- `npm run lint` completes with warnings only; `npm run build` completes successfully.
- `.env.local` is ignored, and no private key/secret value was found in tracked files or inspected Git history.

## Recommended remediation order

1. Disable/fix arbitrary CID proxying and make admin authorization fail closed.
2. Rotate/harden operational keys; move owner to multisig; add quote anomaly monitoring/circuit breaker.
3. Upgrade the vulnerable wallet dependency tree in a tested branch.
4. Enforce SIWE domain checks, upload validation, rate limits, timeouts and security headers/CSP.
5. Completed: replaced the stale collection URI, verified OpenSea, and permanently froze token metadata.
6. Expand negative-path tests and clear the remaining lint warnings.
