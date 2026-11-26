# Claude Code prompt pack · Splashz Treasury

Six prompts. Run them **in order, one Claude Code session each**, from the repo root. Each prompt ends with acceptance criteria. Do not start the next prompt until every criterion of the current one passes and is committed.

| # | File | What it delivers | Typical time |
|---|---|---|---|
| 0 | `00-CONTEXT.md` | Paste **first in every session**. Product, rules, repo map, commands | n/a |
| 1 | `01-CONTRACTS.md` | Harden and deploy the 6 contracts on BSC testnet | 1 session |
| 2 | `02-LIVE-DATA.md` | Atlas on-chain + CoinGecko off-chain prices, DefiLlama yields, RPC | 1 session |
| 3 | `03-DESIGN-AND-MOTION.md` | Tokens, themes, components, motion system | 1 session |
| 4 | `04-PAGES-AND-FLOWS.md` | Landing, wallet gate, dashboard, fund, portfolio, stocks | 1–2 sessions |
| 5 | `05-QA-AND-RELEASE.md` | Tests, browser E2E, deploy checklist, QA report | 1 session |
| 6 | `06-FUND-DETAILS-AND-FIXES.md` | Fund details page before investing; review fixes; trustee approvals | 1 session (before Demo Night) |

## How to paste

```
<contents of 00-CONTEXT.md>

---

<contents of 0N-….md>
```

## State of the repo when this pack was written (26 Nov 2026)

Most of this already exists in `main`. Prompts are written so Claude Code **reads the existing code first and changes only what the prompt requires**. If something already meets an acceptance criterion, the session should prove it (test, screenshot), not rewrite it.

Open decisions (prompts use the defaults until Sky changes them):

| Decision | Default in prompts | Options |
|---|---|---|
| Colour theme | **`cobalt`, chosen by Sky** | Do not switch. `midnight` and `azure` stay as unused tokens |
| Logo | Sky's S-mark (done) | n/a |
| Testnet RPC on demo day | publicnode → drpc | Private RPC via `NEXT_PUBLIC_BSC_TESTNET_RPC` |
