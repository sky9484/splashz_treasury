> **Superseded for builds by `docs/claude-code/`**: the six-prompt pack with acceptance criteria. This file stays as a one-page summary.

# Build prompt · Splashz Treasury

Use this to rebuild or extend the app with a coding agent. It describes what the current code does, so changes stay consistent.

## Product

Splashz by Move Labs. Users earn on idle stablecoins without giving up custody. There are three products:

1. **Funds and bonds** from licensed fund managers in Malaysia and Indonesia. Never name a manager in the UI; say “Licensed fund manager”.
2. **Stablecoin vaults** that track the leading BNB Chain and Ethereum lending markets.
3. **Tokenized stocks**: live prices, plus an order preview only.

Do not show “Pay a supplier” anywhere.

## Routes

- `/` is the landing page. The top nav has the wordmark, anchor links and a **Launch app** pill on the right. Sections, in order:
  - hero with a live hero card
  - live rates ticker
  - products
  - how it works
  - why Splashz
  - proof (contract events)
  - FAQ
  - CTA band
  - footer with the risk disclaimer
- `/app` is the dashboard. It is wallet-gated: until MetaMask is connected, show the “Your wallet is your account” gate and the live market rates, and nothing else.
- `/app/funds/[key]` holds the steps eligibility → approve → subscribe, plus redeem request and cancel.
- `/app/portfolio` shows holdings read from contracts and receipts read from chain events.
- `/app/stocks` shows on-chain Atlas prices (price of record), cross-checked against CoinGecko, and an order preview. The order button stays disabled until a partner exists.
- The first `/app` visit shows the disclaimer gate: a checkbox, then “Agree and continue”. It is stored as `splashz.disclaimer.v1`.

## Visual system (`web/src/app/globals.css`)

This is the Stablecorp-style editorial DNA with Splashz colours. Don't copy its layout.

**Colours**
- Ground `#F3F2EE`
- Panel `#FFF`
- Ink `#121212`
- Muted `#6B6660`
- Hairline `#E4E2DD`
- Primary cobalt `#1F3FD6`
- BNB gold `#F0B90B` (chain markers only)

**Type**
- Headings: Cabinet Grotesk 500, with tight negative tracking.
- Body: Satoshi.
- Eyebrows: 11px uppercase, 2.2px tracking, cobalt.

**Containers**
- Square corners, a 1px hairline and a long soft lift: `0 30px 60px -30px rgba(16,24,64,.25)`.
- Grids are split by hairline rules, not by gaps.

**Buttons**
- Uppercase 12px pills with 1.2px tracking, a leading circular icon, and a primary or outline style.

**Rules**
- Sections are separated by a top hairline and get about 112px of vertical padding.

## Rules that must hold

- **Never show a made-up number.** If a source fails, show “unavailable” or a dash.
- **Wallet:**
  - Offer only the EIP-6963 provider with rdns `io.metamask`.
  - Chain 97.
  - The button label is “Connect wallet”.
- **Hydration:** render wallet-dependent UI only after mount (`useMounted`). The server does not know the wallet state.
- **Modals:** portal them to `document.body`. The sticky topbar uses `backdrop-filter`, which traps `position: fixed`.
- **Transactions** go through `useTx`. It handles:
  - the sign → wait for receipt sequence
  - an in-flight lock
  - friendly revert messages
- **Subscribe:**
  - `minShares = quote × (1 − 0.5%)`.
  - The order id is kept in sessionStorage and rotated after success.
- **Redemptions** stay “Pending” until the trustee settles. Show Cancel.
- **Copy:** label fund NAVs as testnet demo data, and keep the risk disclaimer in the footer and the gate.

## Contracts (`contracts/contracts`)

- `MockUSDT`: tUSDT, with `faucet()` giving 10,000 per wallet per 24 hours.
- `InvestorRegistry`:
  - `isEligible` and `COMPLIANCE_ROLE`.
  - `selfCertify()` is for testnet only and can be switched off.
- `FundShare`: units move only between eligible holders, and only the router mints, burns or escrows.
- `NavOracle`:
  - Accepts EIP-712 `NavUpdate{nav, asOf, nonce}` signed by `MANAGER_ROLE`.
  - Enforces the max age, a cap on how far each update can move, nonce replay protection and a future-time guard.
- `SubscriptionRouter`:
  - Non-custodial: stablecoin goes investor → trustee, and the fee goes to the fee recipient.
  - Order-id replay protection.
  - Redemption request, settle (`SETTLER_ROLE`, which is the trustee) and cancel.
- `StableVault`: ERC-4626 with a decimals offset of 6, and a keeper that records the reference APY and its source and reports yield.

## Commands

```bash
cd contracts && npm test                                  # 14 tests
cd web && npm run typecheck && npm test && npm run build  # 7 unit tests
```
