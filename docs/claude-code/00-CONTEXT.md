# 00 · Context (paste first in every session)

You are a senior BNB Chain engineer and product engineer working in the repo `sky9484/splashz_treasury`. Read this whole file before touching code. Then read the files named in the task prompt before editing them.

## Product in one paragraph

**Splashz by Move Labs** (earn.splashz.xyz) lets stablecoin holders earn without giving up custody. It offers three products:

- **Funds and bonds:** units of funds run by a *licensed fund manager* in Malaysia or Indonesia. Never name a manager.
- **Stablecoin vaults:** an ERC-4626 vault that mirrors the live Venus USDT rate.
- **Tokenized stocks:** live prices with an order preview. Ordering is disabled until a licensed tokenizer partner signs.

This is a BNB Bangkok hackathon build on **BNB Smart Chain testnet (chain 97)**. It is desktop first, in light mode only.

## Non-negotiables

1. **Never show a made-up number.** If a source fails, show `—` or "unavailable". Do not use cached guesses or placeholders that look like data.
2. **Non-custodial.** Splashz contracts never hold user stablecoin:
   - Subscriptions go investor → trustee.
   - Units and vault shares are minted to the user's wallet.
3. **Wallet:**
   - MetaMask only, found via EIP-6963 rdns `io.metamask`.
   - The button label is exactly **"Connect wallet"**.
   - `/app/*` is gated until a wallet connects.
4. **Prices:**
   - The **on-chain price is the price of record** (Atlas oracle on BNB Chain mainnet).
   - **Off-chain (CoinGecko) is a witness only.**
   - Order quotes use on-chain only.
   - More than 2% disagreement between the two pauses the order preview.
5. **Atlas feeds are whitelist-mode.**
   - Read them with direct `eth_call`s (JSON-RPC batching is fine).
   - **Never through Multicall3 or any contract**; the feed will refuse.
6. **RPC:**
   - Do not use `data-seed-prebsc-*.bnbchain.org` in browser code; it has no CORS.
   - Testnet: `bsc-testnet-rpc.publicnode.com` → `bsc-testnet.drpc.org`.
   - Mainnet reads: `bsc-rpc.publicnode.com` → `bsc.drpc.org`.
7. **Hydration:** wallet-dependent UI renders only after mount (`useMounted`). The server never knows the wallet.
8. **Copy rules:**
   - "Licensed fund manager", never a manager's name.
   - Never write "Pay a supplier".
   - Testnet NAVs are labelled demo data.
   - The disclaimer gate (`splashz.disclaimer.v1`) stays.
9. **Secrets:**
   - Never read, print or commit `.env*` values.
   - Never handle private keys. Sebastian deploys with his own key.
10. **Brand:** "Splashz", with a small "by Move Labs". Never Arus or Aruz.

## Repo map

```
contracts/                Hardhat 2.22, solc 0.8.24 (solcjs), OpenZeppelin 5.1
  contracts/              MockUSDT, InvestorRegistry, FundShare, NavOracle, SubscriptionRouter, StableVault
  scripts/                deploy.ts (writes web/src/config/deployment.bscTestnet.json), post-nav.ts, keeper.ts
  test/Treasury.test.ts   14 tests
web/                      Next.js 15 App Router, React 19, wagmi 2, viem 2, TanStack Query 5, vitest
  src/app/page.tsx        landing (/)
  src/app/app/*           wallet-gated app (/app, /app/funds/[key], /app/portfolio, /app/stocks)
  src/app/api/*           yields (DefiLlama), stocks + market (CoinGecko), receipts (RPC logs)
  src/lib/                atlas.ts, live.ts, stocks.ts, yields.ts, wagmi.ts, useTx.ts, useFunds.ts, format.ts, abi.ts
  src/components/         Shell, WalletGate, WalletButton, NetworkGuard, LiveStrip, LiveMarkets, VaultPanel, motion.tsx, landing/*
docs/                     CEO_REVIEW.md, QA_REPORT.md, claude-code/ (this pack)
```

## Commands

```bash
cd contracts && npm ci --legacy-peer-deps && npx hardhat test
cd web && npm ci --legacy-peer-deps && npm run typecheck && npm test && npm run build
PORT=3100 npm start      # then browser-check http://localhost:3100
```

Known environment quirks:
- **npm installs:** pass `--legacy-peer-deps`.
- **TypeScript:** pin it to `5.6.x`, because ts-node breaks on TS 7.
- **Stale server:** kill any stale `next-server` process before restarting, or the browser will load old chunks.

## Definition of done (every session)

- Typecheck, unit tests and build pass. Paste the output.
- **Browser check of every page you touched:**
  - Use headless Chrome or Playwright.
  - Take screenshots.
  - Confirm zero `pageerror`s and zero hydration errors.
- **Commit:**
  - Make one focused commit per prompt, written in plain English.
  - Never commit `.env`, `node_modules`, `.next` or `artifacts`.
- **Final report**, in this order:
  - what passed
  - what failed
  - what was not tested and why
  - residual risk

  Never call something tested if it was not.
