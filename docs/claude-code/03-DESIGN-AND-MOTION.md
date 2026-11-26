# 03 · Design system and motion

## Goal

One coherent editorial-fintech system. It takes Stablecorp's DNA but uses our own layout, three switchable blue-family themes, and subtle motion that explains change without delaying anything.

## Read first

- `web/src/app/globals.css`
- `web/src/components/motion.tsx`, `Logo.tsx`, `Shell.tsx`, `WalletButton.tsx`
- `web/src/app/page.tsx`

## Visual DNA (keep)

**Paper and containers**
- **Paper:** warm or cool off-white ground. Panels are white.
- **Containers:**
  - Square corners and a 1px hairline (`--line`).
  - A long soft lift: `--lift: 0 30px 60px -30px rgba(…)`.
  - Grids are divided by hairline rules, never by gaps between rounded cards.
- **Sections:** separated by a top hairline, with 112px vertical padding. The content wrap is 1120px.

**Type**
- **Headings:** Cabinet Grotesk 500 with negative tracking.

  | Element | Size | Tracking |
  |---|---|---|
  | h1 | 44px (64px in the landing hero) | −1.2px |
  | h2 | 28–40px | −0.7px |

- **Body:** Satoshi 15px.
- **Numbers:** display font with `tabular-nums`.
- **Eyebrows:** 11px, uppercase, 2.2px tracking, in the primary colour.

**Buttons**
- Pills, uppercase, 12px, 1.2px tracking.
- A leading 26px circular icon, offset −12px.
- Variants: `primary`, `ink`, `outline`, `ghost`, `block`.

**Tags**
- 10.5px uppercase.
- Colours: `green`, `amber`, `gold` (BNB), `blue`, `grey`, `red`.

**Colour rule**
- BNB gold (`--gold`) marks chain things only: chain pills, BNB Chain tags and the logo dot.

## Themes

Tokens live on `:root` and `[data-theme="…"]`. The default is set by `NEXT_PUBLIC_THEME` and applied as `<html data-theme>` in `app/layout.tsx`. Add this env var; the default is `cobalt`.

| Theme | Primary | Paper | Character |
|---|---|---|---|
| `cobalt` (**chosen**, default) | #1F3FD6 | #F3F2EE warm | Editorial, closest to Stablecorp DNA |
| `midnight` | #2A5BFF | #EEF1F7 cool | Institutional: navy rail and landing hero, navy proof band |
| `azure` | #0A84FF | #F5F8FB airy | Consumer-friendly: white rail, azure gradient accents |

Previews: `docs/previews/{cobalt,midnight,azure}_{1_hero,2_products,3_how,4_dashboard,5_stocks}.jpg`.

**Logo:** the `Logo` component draws the mark with `var(--primary)` and `var(--gold)`. When Sky supplies the white Splashz logo:
1. Put it at `web/public/brand/splashz-white.svg`.
2. Render it on a `--primary` tile in `Logo`.
3. Use the same file for `app/icon.svg`.

## Motion system

Motion only explains something: arrival, change, cause or state. Never hijack scroll, never use parallax, never delay input.

**Tokens**

| Token | Value | Used for |
|---|---|---|
| `--ease` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | All motion |
| `--t-fast` | 120ms | Press, hover feedback |
| `--t-state` | 200ms | Tabs, toggles, notices, colour changes |
| `--t-arrive` | 320ms | Section and panel arrival, modal |

**Behaviours**

| Moment | Motion | Implementation |
|---|---|---|
| Section or panel enters the viewport | Opacity 0→1 and translateY 8→0, 320ms. Siblings stagger 60ms (max 5). Plays once. | `<Reveal i={n}>` (IntersectionObserver) |
| Live number changes | Brief green or red tint by direction, fading over 900ms | `<Flash value={n}>` |
| Button press | scale 0.98 | CSS `:active` |
| Button hover | The icon arrow nudges 2px right | CSS |
| Modal open | Scrim fades in 200ms; dialog rises 6px and scales .99→1 over 320ms | CSS keyframes |
| Tx progress steps | Background and colour cross-fade 200ms per step | `.step` transition |
| Tx result notice | Fades in 200ms | `.notice` animation |
| Skeletons | Shimmer 1.2s | `.skeleton` |
| Hero flow demo | The three steps tick every 1.4s | `HeroCard` interval |
| Live dot | 2s pulse ring | `.live-dot` |

**Reduced motion:** with `prefers-reduced-motion: reduce`:
- Every animation and transition above is off.
- `.reveal` content is visible immediately.
- The hero flow shows all steps done.

**No-JS:** `<noscript>` forces `.reveal` visible.

**Performance budget**
- Animate only `opacity`, `transform` and `background-color`.
- No layout-affecting animation.
- No animation library. CSS plus about 60 lines of hooks; do not add Framer Motion or GSAP.

## Tasks

1. Add `NEXT_PUBLIC_THEME` and apply `data-theme` on `<html>` server-side, with no flash.
2. Move the per-theme overrides into a clearly commented block.
   - Every theme must pass WCAG AA for body text (4.5:1) and large text (3:1).
   - Write `scripts/contrast.mjs` to check the token pairs.
3. Apply `<Reveal>` to the landing sections and the dashboard panels.
   - Already done for most; complete the portfolio and fund pages.
4. Apply `<Flash>` to every live number: the strip, APY cards, stock prices, NAV and balances.
5. Add the logo slot so the white SVG drops in without code changes.

## Acceptance criteria

- Screenshots of all 5 key screens in all 3 themes, rendered from the running app (`docs/previews/`).
- A reduced-motion run (Playwright `reducedMotion: 'reduce'`) shows all content with no transitions.
  - Assert that `getComputedStyle(el).transitionDuration` is `0s` on `.reveal`.
- The contrast script passes for all themes. Paste its output.
- Lighthouse on `/` (desktop): CLS < 0.02 and TBT < 150ms.
- No new runtime dependencies (`git diff package.json`).
