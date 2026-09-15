## Security Issues , I did this for fun lol

# Security Assessment Report

**Target:** `Evodoc-Repos/Jyotirgamaya-website`
**Type:** Next.js 15 / React 19 static marketing website
**Scope:** Full source tree, dependency manifest, and complete git commit history (32 commits)
**Date:** 2026-09-16

---

## 1. Executive Summary

The repository is a client-facing Next.js marketing site (no API routes, no server actions, no database, no authentication). This significantly limits the attack surface compared to a typical web application. No secrets, credentials, or private keys were found anywhere in the current source tree or in the full git history.

However, the assessment identified **1 code-level vulnerability**, **outdated dependencies carrying multiple disclosed CVEs (including two unauthenticated RCEs)**, and **missing baseline security headers**. None of these are actively exploitable *today* given the site's current static/no-backend usage, but several become live risks the moment the project adds a contact form, API route, or server action — which is common for a site like this to grow into.

| # | Issue | Severity | Exploitable today? |
|---|-------|----------|---------------------|
| 1 | Reverse tabnabbing via `target="_blank"` without `rel="noopener noreferrer"` | Medium | Yes |
| 2 | Outdated Next.js (15.1.11) — multiple CVEs incl. unauthenticated RCE | High | Latent (no API routes/server actions in use yet) |
| 3 | `swiper` — critical prototype pollution (CVE range) | Critical (library), Low (current usage) | Latent |
| 4 | Vulnerable transitive dependencies (postcss, sharp, svgo, picomatch, yaml) | High/Moderate | Latent — mostly build-time/tooling exposure |
| 5 | No security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy) | Low–Medium | Yes (defense-in-depth gap) |
| 6 | No `robots.txt` / `sitemap.xml` | Informational | N/A |

---

## 2. Detailed Findings

### Finding 1 — Reverse Tabnabbing (Missing `rel="noopener noreferrer"`)
**Severity:** Medium
**Location:** `src/Components/Navbar.tsx`, lines 81 and 119

```tsx
<Link
  href={social.link}
  target="_blank"
  key={"icon" + index + 1}
  className="text-xl hover:text-blue">
```

**Issue:** Both social-icon links in the navbar open in a new tab via `target="_blank"` but do not set `rel="noopener noreferrer"`. Without this, the newly opened page gets a `window.opener` reference back to the original Jyotirgamaya tab and can use `window.opener.location = "..."` to silently redirect the original tab to a phishing/malicious page — a classic **reverse tabnabbing** attack. This is especially relevant if any of the linked destinations were ever compromised or if the `social.link` values are made dynamic/CMS-driven in the future.

Note: `src/Components/Footer.tsx` (line 188–189) already does this correctly with `rel='noopener noreferrer'` — the fix just needs to be applied consistently to the Navbar component.

**Recommendation:** Add `rel="noopener noreferrer"` to both `Link` elements in `Navbar.tsx`.

---

### Finding 2 — Outdated Next.js (15.1.11) with Multiple Disclosed CVEs
**Severity:** High
**Location:** `package.json` / `package-lock.json` — `next` pinned/resolved to `15.1.11`

`npm audit` against the committed lockfile surfaced the following advisories affecting this version:

- **GHSA-p293-qw3h-jr36** — Unauthenticated Remote Code Execution on Windows-hosted servers
- **GHSA-2xp9-vwfh-vxw4** — Unauthenticated Remote Code Execution in the Image Optimization API when AVIF files are used
- **GHSA-955p-x3mx-jcvp** — Unauthenticated disclosure of internal Server Function endpoints
- **GHSA-89xv-2m56-2m9x** — Server-Side Request Forgery in Server Actions on custom servers
- **GHSA-p9j2-gv94-2wf4** — Server-Side Request Forgery via attacker-controlled rewrite destination hostname
- **GHSA-68g3-v927-f742** / **GHSA-4633-3j49-mh5q** — Cache confusion of response bodies (can leak one user's response to another)
- **GHSA-4c39-4ccg-62r3** — Unbounded Server Action payload size on the Edge runtime
- **GHSA-m99w-x7hq-7vfj** — Denial of Service in the App Router via Server Actions

**Current risk:** The codebase does not currently define any API routes, middleware, or `"use server"` actions, so the Server Action/SSRF-specific issues are not actively reachable today. The image optimization RCE and Windows-hosted RCE are framework-level and depend on deployment specifics (e.g., whether AVIF is served through `next/image`, whether hosting is Windows-based — Vercel/Linux hosting is not affected by the Windows-specific one).

**Recommendation:** Upgrade to the latest Next.js 15.x patch release (15.5.25 or later at time of writing) regardless of current usage, since this is a one-line dependency bump with low regression risk and removes all of the above from the table before any server-side functionality is added later.

---

### Finding 3 — `swiper` Critical Prototype Pollution
**Severity:** Critical (per advisory), practical impact currently low
**Location:** `package.json` — `swiper: ^11.2.1` (resolves to 11.2.1, inside the vulnerable 6.5.1–12.1.1 range)
**Advisory:** GHSA-hmx5-qpq5-p643

Prototype pollution in a client-bundled carousel library. Exploitation would require an attacker to control input that reaches the vulnerable merge/options-parsing path in the browser. Given the site uses Swiper with static, developer-defined configuration (no user-supplied config reaching Swiper), current exploitability is low — but it should still be patched, since front-end prototype pollution bugs are frequently chained with other bugs (e.g., XSS gadgets) once any dynamic input is introduced.

**Recommendation:** Upgrade to `swiper@14.x`. This is a major version bump — the carousel components (`src/app/career-counselling/Components/slider.tsx`, `TestimonialSlider.tsx`, etc.) should be manually re-tested after upgrading, as Swiper 12–14 changed some APIs.

---

### Finding 4 — Vulnerable Transitive Dependencies
**Severity:** High/Moderate (varies)

`npm audit` also flagged, as transitive dependencies:

| Package | Issue | Severity |
|---|---|---|
| `postcss` (≤8.5.22) | XSS via unescaped `</style>` in stringify output; path traversal / arbitrary file read via `sourceMappingURL` (multiple related GHSAs) | High |
| `sharp` (≤0.35.4-rc.0) | Inherited libvips/libheif CVEs (CVE-2026-33327, -33328, -35590, -35591; GHSA-rgj7-g3m4-5g8c) | High |
| `svgo` (3.0.0–3.3.4) | Billion Laughs DoS via DOCTYPE entity expansion; `removeScripts` plugin incompletely sanitizes executable script/`foreignObject` content | High |
| `picomatch` (≤2.3.1) | ReDoS via extglob quantifiers; method injection in POSIX character classes | High |
| `postcss-selector-parser` (6.1.0–6.1.2) | DoS via uncontrolled AST recursion | Moderate |
| `yaml` (2.0.0–2.8.2) | Stack overflow via deeply nested YAML collections | Moderate |

Most of these sit in the build/tooling chain (CSS processing, SVG optimization, YAML parsing pulled in by other tools) rather than in code that runs in end-users' browsers, so the realistic exposure is primarily to whoever runs `npm run build` / `next dev` — e.g., a malicious SVG or crafted CSS/YAML fed into the build pipeline. Still worth clearing out.

**Recommendation:** Run `npm audit fix` for the non-breaking fixes, then evaluate `npm audit fix --force` for the ones requiring major bumps (mainly pulled in via the Next.js and Swiper upgrades above).

---

### Finding 5 — No Security Headers Configured
**Severity:** Low–Medium
**Location:** `next.config.ts` (no `headers()` block present)

The site sets no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`. Depending on the hosting platform, some of these may be set by default (e.g., Vercel adds a few), but none are guaranteed by the application itself. Without `X-Frame-Options` / `frame-ancestors`, the site can be embedded in an `<iframe>` on a third-party site for clickjacking purposes.

**Recommendation:** Add a `headers()` export in `next.config.ts` setting, at minimum, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a baseline `Content-Security-Policy`.

---

### Finding 6 — No `robots.txt` / `sitemap.xml`
**Severity:** Informational

Not a security issue, but worth noting for completeness since it was checked: neither file exists in `public/`. Purely an SEO/crawl-control gap, not a risk.

---

## 3. What Was Checked and Found Clean

To be transparent about scope, the following were explicitly checked and **no issues were found**:

- **Secrets/credentials:** No API keys, tokens, passwords, or private key material anywhere in the current source tree, `package.json`, `next.config.ts`, or across **all 32 commits** in the full git history (checked via `git log --all -p` against common secret patterns).
- **`.gitignore`:** Correctly excludes `.env*` and `*.pem`.
- **XSS sinks:** No use of `dangerouslySetInnerHTML`, `eval()`, `new Function()`, `innerHTML`, or `document.write` anywhere in `src/`.
- **Server-side attack surface:** No API routes (`route.ts`), no middleware, no `"use server"` actions exist in the codebase — there is currently no backend logic to attack (SQLi, SSRF, auth bypass, etc. are all not applicable).
- **Forms:** No `<form>` elements or client-side data submission in the codebase; the only "forms" are external links out to a Google Forms URL.
- **Insecure randomness:** The `random` npm package is a declared dependency but is not imported or used anywhere in `src/`; no `Math.random()` usage in security-relevant contexts either.
- **`next/image` remote sources:** No `remotePatterns`/`domains` configured, so the Image Optimization endpoint cannot be pointed at attacker-controlled URLs (mitigates part of Finding 2's practical impact).

---

## 4. Recommended Remediation Order

1. **Immediate, zero-risk fix:** Add `rel="noopener noreferrer"` to the two `Link` elements in `Navbar.tsx` (Finding 1).
2. **Low-risk dependency bump:** `npm audit fix` (patches postcss-selector-parser, picomatch, svgo, yaml non-breaking issues), then upgrade `next` to latest 15.x.
3. **Medium-effort, test required:** Upgrade `swiper` to v14.x and manually re-test all carousel/slider components.
4. **Cheap hardening:** Add a `headers()` block to `next.config.ts` for baseline security headers.
5. **Optional:** Add `robots.txt` / `sitemap.xml` for SEO hygiene.

---

*This report reflects a source-code and dependency review only. No active exploitation, live traffic testing, or infrastructure/hosting-level testing (DNS, TLS config, WAF, CDN) was performed against a running deployment.*


## ENJOY
