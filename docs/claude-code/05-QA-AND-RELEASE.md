# 05 · QA and release

## Goal

A verifiable release of earn.splashz.xyz on BSC testnet, with an honest QA report.

## Verification ladder (do it in this order, stop at the first failure)

1. `contracts`: `npx hardhat test`. Paste the counts and the gas table.
2. `web`: `npm run typecheck && npm test && npm run build`.
3. `node scripts/check-feeds.mjs`. Every Atlas feed must be present, have 18 decimals, and be younger than 6 h.
4. Start the production server.
   - Make sure no stale `next-server` is running first.
   - Open `/api/yields`, `/api/stocks`, `/api/market` and `/api/atlas`. Each must say `"status":"live"` from the **host**, not only from a browser.
5. **Playwright suite:**
   - landing
   - gate
   - mock-wallet connect
   - all `/app` routes in 3 themes
   - reduced motion
   - recorded-fixture live data
   - all-sources-down
   - the +3% disagreement case
6. **Real MetaMask walkthrough** on BSC testnet (from 04, both flows).
7. **Financial invariants on testnet**, after the walkthrough:
   - The router's tUSDT balance is 0.
   - Trustee received plus fee recipient received equals the sum of subscribed amounts.
   - The units supply equals the sum of minted units minus burned units.

   Read these with `cast` or a script and paste them.

## Deploy checklist (Sebastian)

- [ ] `contracts/.env` holds a funded `DEPLOYER_PRIVATE_KEY` and never leaves the machine.
- [ ] `npm run deploy:testnet`, then `npm run verify:testnet`.
- [ ] Commit `web/src/config/deployment.bscTestnet.json`.
- [ ] `npm run post-nav` for each fund. Set the NAV cron to daily (oracle `maxAge` is 7 days).
- [ ] `npm run keeper` once. Set the keeper cron to hourly.
- [ ] Rehearse one subscribe and one redemption, then settle.
- [ ] Web host env:
  - `NEXT_PUBLIC_BSC_TESTNET_RPC` (a private RPC is recommended for demo day)
  - `NEXT_PUBLIC_THEME`
  - `COINGECKO_API_KEY` (optional)
- [ ] Build and start on earn.splashz.xyz. Then confirm:
  - all 4 API routes are live
  - the strip shows block and gas
  - stocks show Verified

## Rollback

The web app is stateless.
- **Bad web release:** roll back to the previous build.
- **Bad contract deploy:**
  1. Deploy again.
  2. Commit the new config.
  3. Rebuild.

  The old contracts become inert, because the UI reads the config.

There are no user funds of value: it is testnet only.

## Report template (`docs/QA_REPORT.md`)

- **Passed:** each item with its command and pasted evidence.
- **Failed, then fixed:** root cause and re-verification.
- **Not tested, and why:** list every one. Never mark it passed.
- **Residual risk:** RPC uptime, oracle freshness during US holidays, unaudited contracts, demo NAVs.
- **Release recommendation:** ship to testnet for the demo, or don't. Never mainnet.
