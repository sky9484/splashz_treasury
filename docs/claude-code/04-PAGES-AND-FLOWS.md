# 04 · Pages and user flows

## Goal

Every page completes its job end to end against real testnet contracts, with every state designed: empty, loading, error, pending, success, stale and wrong network.

## Read first

- Everything under `web/src/app/`
- `web/src/components/*`
- `web/src/lib/useTx.ts`, `useFunds.ts`

## Routes

| Route | Access | Job |
|---|---|---|
| `/` | Public | Explain, prove liveness, and send users to Launch app |
| `/app` | Wallet-gated | See balances; faucet; reach funds, the vault and stocks |
| `/app/funds/[key]` | Wallet-gated | Eligibility → approve → subscribe; redeem, pending, cancel |
| `/app/portfolio` | Wallet-gated | Holdings and on-chain receipts |
| `/app/stocks` | Wallet-gated | On-chain prices, verified against CoinGecko; order preview |

## Landing (`/`)

The sections, in order:

1. **Nav:** wordmark, anchor links, and a **Launch app** pill on the right.
2. **Hero:**
   - Eyebrow: "Built on BNB Chain · testnet live".
   - h1: "Idle stablecoins, *put to work* without leaving your wallet."
   - A lede, then the Launch app and How it works buttons.
3. **HeroCard:** a mini dashboard with live APYs and the 3-step flow demo.
4. **LiveStrip:** BNB, USDT, USDC, testnet block, gas.
5. **Live APY ticker:** 6 markets.
6. **Products:** 3 columns, each with a status tag ("Testnet live" or "Preview").
7. **How it works:** 4 numbered steps.
8. **Why Splashz:** a 6-cell grid.
9. **Proof:** a dark band showing the event signatures.
10. **FAQ:** `details` elements.
11. **CTA band.**
12. **Footer:** with the risk disclaimer.

Copy rules are in 00-CONTEXT. Do not add logos of partners who have not signed, or any testimonials or statistics.

## Shell and gate

**Shell**
- **Rail:** wordmark, nav, and a testnet note.
- **Topbar:** page eyebrow and `WalletButton`.
- **Main area, top to bottom:**
  1. `LiveStrip`
  2. `NetworkGuard`
  3. `WalletGate(children)`

**WalletGate**

| State | What it shows |
|---|---|
| Not mounted, or reconnecting for ≤ 1.5 s | Skeleton |
| Disconnected | "Your wallet is your account." panel with Connect wallet, plus live markets |
| Connected | The page |

**DisclaimerGate:** shows on the first `/app` visit only. It is a checkbox plus "Agree and continue", stored in `localStorage` (`splashz.disclaimer.v1`).

**Wallet modal**
- Portalled to `body`.
- Shows only the MetaMask row (EIP-6963 `io.metamask`), or an "Install MetaMask" link if none is found.
- Shows the decline error in plain words.

## Fund subscribe flow (`/app/funds/[key]`)

```
[Eligible?] --no--> Confirm eligibility (selfCertify, testnet) --> tx --> refetch
     |yes
[Allowance ≥ amount?] --no--> Approve tUSDT (max) --> tx --> refetch
     |yes
Quote (router.quote) --> minShares = shares × 0.995 --> subscribe(amount, minShares, orderId)
     --> tx pending (hash link) --> success: units in wallet, rotate orderId, receipt appears in Portfolio
```

- **Order id:** `keccak256(scope:time:random)`, kept in `sessionStorage` per fund, wallet and side. Rotate it after success. A double click is blocked while a tx is in flight.
- **Redeem:**
  - `requestRedeem(units, orderId)` puts the request in the Pending state.
  - The panel says "waiting for the trustee" and offers **Cancel**.
  - Settlement is done by the trustee (`scripts/settle.ts`). The UI polls `redemptions(orderId)` every 15 s.
- **States to design and screenshot:**
  - not eligible
  - self-certify closed
  - NAV stale (orders paused)
  - amount above the balance
  - approve needed
  - quote loading
  - slippage revert
  - user rejected
  - insufficient gas (tBNB faucet link)
  - pending redemption
  - success

## Vault (dashboard panel)

- **Actions:** Deposit and Withdraw tabs.
  - Approve when needed.
  - Max fills the wallet balance or the position.
  - Withdraw converts the amount to shares in proportion.
- **Displays:**
  - The live reference APY (DefiLlama Venus USDT).
  - The last rate recorded on-chain (`referenceApyBps`).
  - TVL.
- Explain the keeper in one sentence.

## Portfolio

- **Holdings:** fund units × NAV, plus vault shares → assets.
- **Receipts:**
  - Read from events with a chunked log scan from `deployBlock`.
  - Each receipt has a tag colour by kind and a BscScan tx link.
  - A Refresh button.
  - Empty state: "No receipts yet".
  - RPC error: an error notice with retry.

## Stocks

See 02-LIVE-DATA. Price steps strip, table, and order preview. The order button stays disabled: "Review order · partner pending".

## Tasks

1. Walk every flow above on BSC testnet with real MetaMask after Sebastian's deploy. Fix anything that breaks.
2. Make sure every state in the fund flow has a designed message. `useTx.explain` already maps errors; extend the map if a revert surfaces raw.
3. **Portfolio:** add a "Pending redemptions" section that lists `RedemptionRequested` events with no Settled or Cancelled event yet, each with Cancel.
4. **Landing:** link "Proof" to a real BscScan tx from the deploy (the first `Subscribed` from Sebastian's rehearsal).
5. **Logo:** if `web/public/brand/splashz-white.svg` exists, use it in the rail, landing nav, footer and favicon.

## Acceptance criteria

- **Screen recording**, or a sequence of screenshots, of:
  1. connect → disclaimer → faucet → eligibility → approve → subscribe → units shown → receipt in Portfolio
  2. redeem → pending → settle (script) → paid receipt

  All on BSC testnet with real MetaMask.
- **Playwright E2E** with a mock EIP-6963 provider:
  - gate → connect → dashboard
  - The wallet modal covers the viewport.
  - No hydration errors on any route.
- Every state listed for the fund flow has a screenshot in `docs/states/`.
