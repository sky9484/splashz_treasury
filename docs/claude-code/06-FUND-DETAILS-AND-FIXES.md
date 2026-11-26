# 06 · Fund details flow + review fixes (Demo Night, Fri 27 Nov 15:00)

Paste `00-CONTEXT.md` first, then this.

## Step 0: sync first (mandatory)

The live site (earn.splashz.xyz) was built from code that is **not on GitHub**. Before changing anything:

1. Commit your local working copy, including `web/src/config/deployment.bscTestnet.json`.
2. Push it to `sky9484/splashz_treasury` on branch `main`.
3. Create the branch `fund-details` from that commit and do all work below on it.
4. Merge back to `main` only after the acceptance criteria pass.

Live deployment (do not redeploy):

| Contract | Address |
|---|---|
| stable (tUSDT) | `0x2644B6647d31675FCA9de0A980aCE6fa933327A8` |
| registry | `0xD0D8F0A816a5f122a1ECe1E28F95cB4009ba4A0F` |
| vault | `0x950bb201764561b07278a49c80eF929b416F1596` |

| Fund | Share | Oracle | Router |
|---|---|---|---|
| shariah-income | `0x19A2989bE47b6223eDdeecc9F25028f42394e459` | `0x6AF1cb2886714a264eD5AFfE586f929D3527BF54` | `0x02dD721dE1dE1e77176F9E8E83aD806Ee9D06477` |
| money-market | `0x017204B1A6F28B240963cbff8a0588dD0ffF0b04` | `0xC4A924B4102874FFF9de67aEF350373498A9Dc03` | `0x694BfEa5451D84383a5e87D6C1543410C551B6fb` |
| govt-bond | `0xE22C18f078D54a7Ea426968a445Da0e557d3b554` | `0x4E4aB1DE6694261c5f122b008406F64762Cc1E1A` | `0x2df7A9cF0aCCCCf51caa50b4B5664C1895139220` |

- `deployBlock` is 144994814.
- One key, `0xD97da366c3E7825C2dCbC8d30e294be4817d99D3`, holds all four roles: deployer, manager, trustee and fee recipient.

## Goal

A user never commits money without seeing the fund first. The flow is:

```
Dashboard funds table ──click row / "View fund"──▶ /app/funds/[key]  (DETAILS: factsheet, returns, NAV chart, risks)
                                                    └── "Invest in this fund" ──▶ invest panel (eligibility → approve → subscribe)
                                                    └── "Redeem" tab (only if user holds units)
```

## Part A: fund factsheet data

1. Create `web/src/config/funds.ts`. It holds the **off-chain factsheet**, keyed by fund `key`, and is merged with the on-chain deployment entry. Each fund has:

   | Field | Type |
   |---|---|
   | `country` | `"Malaysia"` or `"Indonesia"` |
   | `countryCode` | `"MY"` or `"ID"` |
   | `currency` | the fund's base currency |
   | `category` | `"Shariah income"`, `"Money market"` or `"Government bonds"` |
   | `shariah` | boolean |
   | `targetReturnPct` | number |
   | `targetReturnLabel` | always `"Target · indicative"` |
   | `minInvestment` | in tUSDT |
   | `liquidity` | e.g. `"Redeem T+2"` |
   | `riskLevel` | 1–5 |
   | `managementFeePct` | number |
   | `platformFeeBps` | read on-chain, don't duplicate |
   | `strategy` | 2–3 sentences |
   | `holdings` | short list of asset types, never company names |
   | `inceptionNote` | text |

   Use these demo values and label them **"Testnet demo factsheet"** in the UI:

   | Fund | Country | Category | Shariah | Target | Liquidity | Risk | Mgmt fee |
   |---|---|---|---|---|---|---|---|
   | shariah-income | Malaysia | Shariah income | yes | 4.0% | T+2 | 2 | 0.50% |
   | money-market | Malaysia | Money market | no | 3.5% | T+1 | 1 | 0.30% |
   | govt-bond | Indonesia | Government bonds | no | 6.0% | T+3 | 3 | 0.60% |

2. Rules:
   - Never name a fund manager: write "Licensed fund manager".
   - Never present a target as a guarantee.
   - Every target figure is shown next to the "Target · indicative" label.

## Part B: real on-chain returns (no invented numbers)

1. Add `web/src/app/api/nav-history/route.ts?key=…`:
   - Read the oracle's `NavUpdated(uint256 nav, uint64 asOf, uint64 nonce, address indexed signer)` events from `deployBlock`, using the chunked log scan already in `/api/receipts`.
   - Return `[{ nav, asOf, txHash }]`.
   - Cache 60 s per key.
2. On the page:
   - **Return since launch** = (latest NAV ÷ first NAV − 1) × 100, labelled "Since launch · on-chain". With fewer than 2 points, show "—" and "Not enough history yet".
   - **NAV chart:** a small inline SVG line chart. No chart library. Hide it when there are fewer than 2 points.

## Part C: details page `/app/funds/[key]`

The page has two layouts. **Before Invest is clicked**, it shows details only:

1. **Header:**
   - fund name
   - "Licensed fund manager · {country}" with a small country code chip
   - tags: `Shariah-compliant` (if true), `Testnet`, `{currency}`
2. **Key-number cells:**
   - NAV per unit, with when it was last struck
   - Return since launch (on-chain)
   - Target return (indicative)
   - Minimum investment
   - Liquidity
   - Fees (management + platform)

   Use the `grid3 cells` style.
3. NAV chart.
4. "About this fund": strategy, holdings, and risk level as a 1–5 bar with a label.
5. "How your money moves": reuse the existing 4 steps.
6. Contract links to BscScan (router, oracle, units).
7. **Sticky action bar** at the bottom:
   - "Invest in this fund" (primary).
   - "Redeem" (outline), visible only when the user holds units.
   - Show "Orders paused: NAV is stale" and disable the button when the NAV is stale.

**After "Invest" is clicked**, the existing subscribe panel slides in on the right:
- Motion: `--t-arrive` 320 ms, `<Reveal>`, translateY only.
- The details stay visible on the left.
- A "Back to details" link closes the panel.
- The panel state lives in the URL as `?action=invest` or `?action=redeem`, so refresh and back work.

**Dashboard funds table:**
- The whole row is a link to `/app/funds/[key]`.
- Add a "Target" column and a country column.
- Rename the button "View fund".
- Remove direct subscribe from the dashboard.

## Part D: review fixes

| # | Fix | Where |
|---|---|---|
| 1 | **Second redemption fails.** Rotate the redemption order ID when `redemptions(orderId).status` is Settled (2) or Cancelled (3), not only on Cancel. | `funds/[key]/page.tsx` |
| 3 | **Unlimited approval.** Approve the exact amount, not `maxUint256`. The button copy should say "Approve {amount} tUSDT". | invest panel and `VaultPanel` |
| 5 | **Zero order ID.** Disable the action until the order ID is not `0x00…00`. | `useOrderId` |
| 6 | **Loading flash.** While eligibility or allowance is loading, show "Checking…" instead of "Confirm eligibility". | invest panel |
| 7 | **Address compare.** Use `isAddressEqual(pending.investor, address)`. | redemption check |
| 8 | **`/api/receipts` hammering.** Cache 30 s per address in memory, and rate-limit to 10 requests per minute per IP. Return 429 with a friendly message. | `api/receipts/route.ts` |
| 9 | **Payout liquidity.** On the details page, read the trustee's tUSDT `balanceOf` and `allowance(trustee, router)`. Show "Payout liquidity: Ready / Not ready", and explain that redemptions stay pending until the trustee settles. | details page |

## Part E: make redemptions actually pay (ops, not UI)

1. Add `contracts/scripts/approve-routers.ts`. The trustee approves each of the 3 routers for tUSDT. Use a fixed large demo cap, e.g. 10,000,000 tUSDT, and print the tx hashes.
2. Add `contracts/scripts/settle.ts` if it's missing: `ORDER=0x… FUND=…` → settle, then print the payout.
3. Run `approve-routers` on testnet. The trustee also needs a tUSDT balance to cover NAV gains, so call `faucet()` from the trustee or `mint`.

## Acceptance criteria (paste evidence for each)

- `npm run typecheck && npm test && npm run build` are green.
- **New unit tests:**
  - return-since-launch maths (0, 1 and 2+ points)
  - `useOrderId` rotation on Settled and Cancelled
  - the receipts cache and rate limit
- **Playwright** with the mock wallet and recorded fixtures:
  - dashboard row click → details page shows country, target (with the indicative label), minimum, liquidity, fees and NAV
  - "Invest" opens the panel, and `?action=invest` survives a refresh
  - 0 page errors and 0 hydration errors
  - screenshots of the Shariah fund details page, before and after Invest, in `docs/states/`
- **Real MetaMask on BSC testnet, on earn.splashz.xyz:**
  1. faucet
  2. open the Shariah fund
  3. Invest → eligibility → approve the **exact** amount → subscribe → units shown
  4. redeem → settle with the script → paid receipt
  5. **redeem a second time**, which must succeed (proves fix 1)
- On-chain, after the run: trustee allowance > 0 for all 3 routers, and the router tUSDT balance = 0.
- Merge `fund-details` → `main`, redeploy the web app, and give Sky the link plus the screenshots.
