## Security Issues , I did this for fun lol cause i am jobless

# Security Report - Jyotirgamaya Website Repo

Hey! So I went through the `Jyotirgamaya-website` repo and did a bit of a security check on it (code + dependencies + full git history). Wanted to write up what I found below 🙂

Just a heads up, this is a Next.js site and from what I can tell there's no backend/API stuff in it right now (no login, no database, no forms that submit anywhere on the site itself) i guess you all are still working on this project , so overall the attack surface is pretty small compared to most apps. But I still found a few things worth fixing, so here's the list..

Quick summary before the details:

- 1 actual code bug (missing `rel` attribute on some links - explained below)
- The Next.js version is pretty outdated and has some scary sounding CVEs attached to it (like actual RCE ones)
- A dependency called `swiper` has a "critical" vulnerability listed for it so check that.
- A bunch of other smaller dependency issues from `npm audit`
- No security headers set up anywhere
- No robots.txt/sitemap (not really a security thing but noting it anyway😂)

Ok here's the breakdown:

---

## 1. Missing `rel="noopener noreferrer"` on Navbar links (this one's real, easy fix though!)

File: `src/Components/Navbar.tsx`, lines ~81 and ~119

```tsx
<Link
  href={social.link}
  target="_blank"
  key={"icon" + index + 1}
  className="text-xl hover:text-blue">
```

So basically these links open in a new tab (`target="_blank"`) but they don't have `rel="noopener noreferrer"` on them. I looked this up because I wasn't 100% sure why it mattered at first, but apparently without that `rel` attribute, the page you just opened in the new tab can actually reach back into the original tab using `window.opener` and redirect it somewhere else (like a fake login page or phishing site) without you noticing. It's called "reverse tabnabbing" - kind of a sneaky attack ngl.

The good news is `Footer.tsx` already does this correctly (it has `rel='noopener noreferrer'` on its link, line 188-189), so it's literally just copy-pasting that same fix over to Navbar.tsx. Should take like 2 mins.

**Severity (my best guess):** Medium
**Fix:** add `rel="noopener noreferrer"` to both Link tags in Navbar.tsx

---

## 2. Next.js version is outdated (15.1.11) and has a bunch of CVEs

I ran `npm audit` on the lockfile and it flagged a bunch of advisories for the exact Next.js version that's pinned in `package.json`. Some of these sound pretty bad honestly:

- Unauthenticated RCE on Windows-hosted servers (GHSA-p293-qw3h-jr36) - RCE = remote code execution, that's the scary one
- Unauthenticated RCE in the image optimization thing when using AVIF files (GHSA-2xp9-vwfh-vxw4)
- SSRF in Server Actions (GHSA-89xv-2m56-2m9x) and in rewrites (GHSA-p9j2-gv94-2wf4)
- Some cache confusion bugs where one user's response could maybe leak to another user (GHSA-68g3-v927-f742, GHSA-4633-3j49-mh5q)
- Unauthenticated disclosure of internal server function endpoints (GHSA-955p-x3mx-jcvp)
- A DoS one too (GHSA-m99w-x7hq-7vfj)

Now, to be fair - since this site doesn't currently have any API routes or server actions (`"use server"`) anywhere in the code that I could find, most of these aren't actually reachable right now. Like, there's no door for the RCE to walk through yet, if that makes sense. But it's still running on an old version with known holes in it, and it's a really easy fix (just bump the version), so I'd say do it anyway before someone adds a contact form or an API route later and forgets this is sitting there.

**Severity:** High (as a CVE), but "latent" / not actively exploitable today given current usage
**Fix:** `npm audit fix --force` bumps it to next@15.5.25 (or whatever the latest patch is by the time you read this)

---

## 3. `swiper` package has a "critical" vulnerability

`package.json` has `swiper: ^11.2.1` which resolves to 11.2.1. npm audit says this whole version range (6.5.1 to 12.1.1) has a prototype pollution bug (GHSA-hmx5-qpq5-p643) and marks it as **critical** severity.

I looked into what this actually means for this site though - prototype pollution bugs like this usually need some kind of attacker-controlled input to actually reach the vulnerable part of the code. From what I saw, the Swiper carousels on this site are all set up with hardcoded config by the devs, not anything a visitor can control. So I don't think it's actively exploitable right this second, but "critical" is still critical and libraries like this get used as building blocks for other attacks later, so I'd patch it anyway.

Heads up though - fixing this means jumping to swiper v14, which is a major version bump, so whoever fixes this should probably test the sliders/carousels still work afterward (the testimonials slider, career counselling slider, etc.)

**Severity:** Critical per the advisory / Low practical risk right now
**Fix:** upgrade to swiper@14.x + retest carousel components

---

## 4. Other vulnerable dependencies from npm audit

There's also a handful of other flagged packages, mostly ones pulled in indirectly (not ones you picked, they came along with other stuff):

| Package | Problem | Severity |
|---|---|---|
| postcss (≤8.5.22) | XSS issue in CSS output + can leak files via sourcemaps | High |
| sharp (≤0.35.4-rc.0) | Inherited CVEs from libvips/libheif image libraries | High |
| svgo (3.0.0-3.3.4) | DoS via "Billion Laughs" attack + doesn't fully strip scripts from SVGs | High |
| picomatch (≤2.3.1) | ReDoS (regex denial of service) bug | High |
| postcss-selector-parser | DoS via recursion | Moderate |
| yaml (2.0.0-2.8.2) | Stack overflow on deeply nested yaml | Moderate |

Most of these are more about the build process than something an actual website visitor could trigger (like, someone would need to feed a malicious SVG or weird CSS into the build pipeline), so I wouldn't panic about these, but might as well clean them up since a lot of them get fixed automatically once you fix #2 and #3 above.

**Fix:** `npm audit fix` for the easy ones, `--force` for the rest (comes mostly bundled with the next.js/swiper upgrades anyway)

---

## 5. No security headers set up

Checked `next.config.ts` and there's no `headers()` config in there at all - so no Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy, nothing. This isn't an active "vulnerability" exactly, more like... missing seatbelts? Without X-Frame-Options for example, someone could technically put this whole site inside an iframe on their own shady site and try to trick people into clicking things (clickjacking).

Whatever platform it's hosted on (looks like it might be Vercel based on the .gitignore) might add some default headers automatically, but it's better not to rely on that and just set them explicitly in the app.

**Severity:** Low-ish, but it's a quick win
**Fix:** add a headers() block to next.config.ts with at least X-Frame-Options, X-Content-Type-Options, and Referrer-Policy

---

## 6. No robots.txt or sitemap.xml

Not security related, just noticed there isn't one in the public folder while I was looking around. Probably worth adding for SEO reasons but doesn't affect security at all, just flagging it since I saw it.

---

## Stuff I checked that came back clean (good news👀)

Wanted to include this part too so it's clear what was actually looked at:

- Went through **all 32 commits** in the git history looking for leaked API keys, passwords, tokens, private keys etc - found nothing 💀 (i am that jobless)
- `.gitignore` correctly excludes `.env*` files and `*.pem` files
- No `dangerouslySetInnerHTML`, `eval()`, `innerHTML`, or `document.write` anywhere in the code (these are common XSS sources so good that they're not here)
- No API routes, middleware, or server actions exist in the codebase at all right now - so no backend to actually attack (no SQL injection, no auth bypass, none of that applies here since there's no server logic)
- No `<form>` elements anywhere - the only "forms" are just external links to a Google Form
- There's a `random` npm package installed but it's not actually used anywhere in the code
- `next/image` isn't configured to load images from any external/remote domains, so that closes off one potential way the image RCE bug from #2 could've been reached

---

## tl;dr - suggested order to fix stuff

1. Add `rel="noopener noreferrer"` to Navbar.tsx links (like, right now, takes 2 min)
2. Run `npm audit fix`, then update Next.js to latest 15.x
3. Update swiper to v14.x and test the carousels still work
4. Add basic security headers to next.config.ts
5. (optional) add a robots.txt/sitemap.xml


*(Note: this was just a code + dependency review, I didn't test against a live deployed version or check hosting/DNS/TLS stuff or maybe i cant find it)*
 ## ENJOY 🧚🏻‍♀️

<img width="318" height="352" alt="Cool" src="https://github.com/user-attachments/assets/68fa4f23-f576-4d07-8d67-5d9abeec3725" />

