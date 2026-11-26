# QA report · Splashz Treasury · 26 Nov 2026

Environment: an isolated build sandbox. Only the npm registry was reachable. There was **no** BSC RPC, DefiLlama, Pyth, Fontshare or MetaMask. Every result below says which of these it depended on.

## Passed (with evidence)

| Check | Command / method | Result |
|---|---|---|
| Contract unit tests | `cd contracts && npx hardhat test` | 14 passing |
| Fund-flow invariants | Same suite. It covers router balance staying 0 after subscribe, fee cap, order-id replay, slippage, ineligible investor, units moving only to eligible holders, and settle vs. cancel permissions | Pass |
| NAV oracle safety | Same suite. It covers wrong signer, replay, older `asOf`, future `asOf`, jump above the cap, and stale NAV | All reverts as designed |
| Trustee can't pay | Same suite | Settlement reverts; redemption stays Pending |
| Local deploy rehearsal | `npx hardhat run scripts/deploy.ts` (in-process network) | Deploys all contracts, posts first NAVs, writes config with `deployBlock` |
| Web type safety | `npm run typecheck` | 0 errors |
| Web unit tests | `npm test` (yield summariser, Hermes parser, amount parsing, slippage) | 7 passing |
| Production build | `npm run build` | Success, 8 routes |
| Landing page renders | Headless Chrome 1440×900, full-page screenshot | Pass. Launch app button → `/app` |
| App gate | Headless Chrome on `/app`, `/app/portfolio`, `/app/stocks`, `/app/funds/x` | Gate shown on all four until a wallet connects |
| Disclaimer gate | Checkbox → “Agree and continue” | Pass |
| Connect wallet (first visit) | Mock EIP-6963 provider announcing `io.metamask` | Modal covers the full viewport; connects; topbar shows the address; dashboard renders |
| Connect wallet (returning) | Mock with an authorised account | Reconnects into the dashboard |
| No MetaMask | Plain browser | Modal shows the “Install MetaMask” link |
| Hydration | Production server, all routes | No React hydration errors (fixed during QA, see below) |
| Honest fallbacks | DefiLlama unreachable in the sandbox | Every rate shows “unavailable” or a dash; no numbers invented |

## Failed, then fixed during QA

1. **Wallet modal scrim covered only the header.** The topbar's `backdrop-filter` trapped `position: fixed`. Fixed by portalling the modal to `<body>`, then re-verified.
2. **React hydration error #418 on every `/app` route.** The server rendered a skeleton while the client chose the gate. Fixed with `useMounted` for wallet-dependent UI, then re-verified with zero errors.
3. **`/api/yields` was statically prerendered at build time.** A build without network access would have served “unavailable” for the first 5 minutes in production. Fixed by making the route dynamic, with caching on the fetch layer.
4. **The gate could hang on the skeleton forever** if a wallet stalls during reconnect. Fixed by allowing 1.5 s, then showing the gate.

## Not tested, and why

| Not tested | Why | How to test after deploy |
|---|---|---|
| Testnet deployment and BscScan verification | No RPC or keys in the sandbox; the agent never handles private keys | Sebastian runs `npm run deploy:testnet` |
| Real MetaMask: connect, switch chain, sign | No extension in a headless sandbox | Manual run with MetaMask on chain 97 |
| Subscribe / redeem / vault transactions from the UI | Needs deployed contracts and a wallet | Manual run of the demo script below |
| Live DefiLlama rates, including the **unverified Aave pool id** | Network blocked | Open `/api/yields`; all three must be `"live"` |
| Live Pyth prices | Network blocked, and it needs `PYTH_API_KEY` | Open `/api/stocks` |
| Receipts over real RPC (log range limits) | Network blocked | Do one subscribe, then check Portfolio → Receipts |
| Keeper and post-nav scripts against testnet | Network blocked | Run each once after deploying |
| Real fonts (Cabinet Grotesk / Satoshi) | Fontshare blocked; screenshots used fallback fonts | Visual check on earn.splashz.xyz |
| Wrong-network banner | Mock wallet was on chain 97 | Connect MetaMask on BSC mainnet, then press Switch |

## Demo script (run twice before Friday)

1. Open `/`, then click Launch app, accept the disclaimer, and connect MetaMask.
2. Click Get 10,000 test USDT.
3. Open a fund, then Confirm eligibility → Approve → Subscribe 1,000. Units appear.
4. In the vault, Deposit 1,000.
5. In Portfolio, check the holdings and both receipts, and open one on BscScan.
6. Redeem 100 units. It shows as pending. The trustee settles with `settleRedemption` from a script or BscScan write; then refresh.

## Residual risk

- The demo depends on public BSC testnet RPC uptime. Keep a private RPC URL ready for `NEXT_PUBLIC_BSC_TESTNET_RPC`.
- Fund NAVs are demo data. Say so out loud on stage.
- The contracts are unaudited. Testnet only.

## Release recommendation

**Ship to testnet for the demo**, provided the post-deploy checks in “Not tested” pass, especially `/api/yields` showing all three markets live and one full subscribe → receipt run in real MetaMask. **Not** for mainnet or real funds.
