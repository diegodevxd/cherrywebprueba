# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

One-page static marketing site for **Cherry Digital**, a web development agency (content is in Spanish/Mexico). It's hand-written HTML/CSS/JS with no framework, no bundler, and no `package.json` — three files carry the entire site.

## Commands

There is no build, lint, or test tooling in this repo — don't look for `npm run` scripts.

- **Local preview**: `python3 -m http.server 8080` from the repo root, then open `http://localhost:8080/index.htm`. Note the entry file is `index.htm`, not `index.html`.
- **No automated tests.** To verify a visual change, take Playwright screenshots (Chromium at `/opt/pw-browsers/chromium` in this environment) at both a desktop width (~1280px) and a mobile width (~390px). Several sections (hero, pricing deck, team carousel, mobile nav) have distinct behavior behind `@media (max-width: 720px)` that a desktop-only screenshot will miss entirely.
- **Gotcha**: the hero/services carousel images are hot-linked from `images.unsplash.com`, not local files. In sandboxed/CI-like environments, that host may be blocked by an egress proxy, so local screenshots render gray placeholders instead of real photos — check the proxy status before assuming a rendering bug.

## Deployment

- Pushing/merging to `main` deploys automatically — no `vercel.json` or CI config exists in the repo; the platform (Vercel, custom domain `cherrycode.dev`; the site has also been served from GitHub Pages) serves the static files as-is.
- **Cache-busting convention**: `index.htm` links `style.css` and `script.js` with a `?v=N` query string. Bump `N` on *both* tags whenever either file changes. There's no filename hashing here, so without bumping the version, returning visitors' browsers keep serving previously cached CSS/JS — this caused a real bug (new HTML shipped while old CSS/JS stayed cached, so a redesigned section rendered with no styling or interactivity at all).

## Architecture

- `index.htm` — all markup, a single page with anchor-linked `<section id="...">`s.
- `style.css` (~1100 lines) — one global stylesheet.
- `script.js` — a single `DOMContentLoaded` handler containing ~12 independent feature blocks. Each block guards itself by checking for its root element or `data-*` attribute before doing anything, so the blocks don't need to know about each other and can be edited independently.

Section order in `index.htm`: navbar → hero (`#inicio`) → servicios (`#servicios`, tilting phone/laptop/tablet device mockups) → paquetes (`#paquetes`, a 3D rotating "deck" of pricing cards plus a monthly maintenance plan) → comparativa (`#comparativa`, feature table) → conceptos (`#conceptos`, horizontal-scroll educational cards + an interactive price simulator) → equipo (`#equipo`, draggable stacked-card carousel) → términos (`#terminos`, single-open accordion) → contacto (`#contacto`) → footer.

Reusable patterns worth knowing before touching any section:

- **`[data-carousel]` + `[data-track]` + optional `[data-dots]`**: the generic auto-advancing image carousel. Supports multiple independent instances on the page (both hero circular carousels use it), is swipe-enabled, and pauses on hover/focus/off-screen. The pricing "deck" (`[data-deck]`), the team carousel (`[data-team-carousel]`), and the concepts carousel (`[data-concepts]`) are each separate, bespoke implementations — they do **not** share code with `[data-carousel]` or each other, so a fix to one won't propagate to the others.
- **`.reveal` / `.anim-words` / `.anim-chars`**: scroll-triggered entrance animations via one shared `IntersectionObserver`. `.anim-words`/`.anim-chars` are additionally split into per-word/per-char `<span>`s on load for a staggered reveal.
- **`[data-tilt]`**: mouse-driven 3D tilt + spotlight, used on the service device mockups. Desktop-only, gated on `(hover: hover)`.
- Almost every animation/interaction block checks `prefers-reduced-motion` (the `reduceMotion` flag at the top of `script.js`) and/or `(pointer: coarse)` / `(hover: hover)` before wiring itself up — follow that pattern for new interactive features rather than assuming a mouse and motion are available.
- Mobile breakpoints are staged and *not* colocated in `style.css`: `900px` (grid collapse), `720px` (mobile nav drawer; hero becomes a full-bleed background carousel with a dark scrim + a glassmorphism card behind the hero text; pricing deck becomes compact stacked cards), `640px`, and `380px` (type scale only). When editing hero or pricing styles, check both the base rule and the `720px` override block — they live far apart in the file and it's easy to change only one.
- `:root` custom properties at the top of `style.css` (colors, easing curves, radii — warm off-white background, near-black ink, one red "cherry" accent) are the single source of truth for the palette; reuse them instead of hardcoding new colors.
- Assets: `logo/LOGO.png` (favicon + navbar chip), `img/devices/*.svg` (phone/laptop/tablet frames for servicios), `paquetes/*.pdf` (downloadable package proposals linked directly from the pricing cards). Hero/servicios photos are hot-linked Unsplash URLs, not local files.
