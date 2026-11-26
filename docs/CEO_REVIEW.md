# CEO review · Splashz Treasury testnet build

**Mode: scope reduction.** Demo Night is Fri 27 Nov, 15:00 Bangkok. The build has to complete one real flow end to end, not show many half-flows. Anything that would need a licence, a partner contract or real manager data is shown honestly as preview or demo.

## Premise

- **Real problem:** stablecoin holders in Southeast Asia have no compliant, non-custodial way to reach licensed fund and bond yield. The status quo is either a CEX earn product (custodial) or a raw DeFi lending market (no fund products).
- **What this build proves:** money moves investor → trustee directly, units come back at a manager-signed NAV, and every step is an on-chain receipt. That is the core of the pitch and the core of the moat.
- **What it does not prove:** that a licensed manager will plug in. That is the partnership track, not the code.

## Decision ledger

| # | Decision | Value | Status |
|---|---|---|---|
| D1 | Chain | BSC testnet (97) only | Approved (BNB hackathon requirement) |
| D2 | Wallet | MetaMask only, via EIP-6963 rdns `io.metamask`; button reads “Connect wallet” | Approved by Sky |
| D3 | App access | Landing at `/`, app at `/app`, gated until a wallet connects | Approved by Sky (26 Nov) |
| D4 | Visual DNA | Stablecorp-style editorial system (sharp containers, long soft shadow, tracked pills) with Splashz cobalt and BNB gold; own layout | Approved by Sky (26 Nov) |
| D5 | Fund NAV | Demo NAV signed by the deploy team, labelled “not real fund data” | Default; real NAV needs a manager agreement |
| D6 | Vault yield | Mirrors live Venus USDT APY via keeper; testnet yield is minted | Default; disclosed in UI |
| D7 | Stock prices | **On-chain price of record from Atlas** (CoinMarketCap-backed successor to Binance Oracle) on BNB Chain mainnet; **CoinGecko as off-chain witness**; >2% disagreement pauses quotes. Order button disabled. | Approved by Sky (26 Nov) |
| D8 | Receipts | Read from chain events, chunked RPC scan (~1 day) | Default; Etherscan V2 indexing deferred |
| D9 | Hosting | Sebastian publishes to earn.splashz.xyz, not Vercel | Approved by Sky |
| D10 | Theme | **Cobalt** (#1F3FD6 on warm paper #F3F2EE). Midnight and Azure tokens kept as unused alternates | Approved by Sky (26 Nov, 18:44) |
| D11 | Motion | CSS-only, 120/200/320ms, reveal + number flash + modal; reduced-motion off | Approved by Sky (26 Nov) |
| D12 | Logo | Sky's S-mark, vectorised to `web/public/brand/splashz-white.svg`, white on a `--primary` tile; also the favicon | Supplied by Sky (26 Nov) |

## Architecture

```
Browser (MetaMask) ──sign──▶ SubscriptionRouter ──stable──▶ Trustee
        │                          │ mint units
        │                          ▼
        │                      FundShare (eligible holders only)
        │                          ▲ NAV checked (age, nonce, jump cap)
        │                      NavOracle ◀── EIP-712 NAV from manager key
        │
        ├──sign──▶ StableVault (ERC-4626) ◀── keeper: DefiLlama APY + yield
        │
Next.js server: /api/yields (DefiLlama) · /api/stocks + /api/market (CoinGecko), browser fallback for every feed · /api/receipts (RPC logs)
```

Single points of failure: the manager key (NAV), the trustee key (settlement liquidity), the public RPC (receipts), DefiLlama (rates). Each one fails visibly; see the table below.

## Failure map

| Failure | Trigger | Handling | User sees | Tested |
|---|---|---|---|---|
| Stale NAV | No NAV posted for more than 7 days | Oracle reverts `StaleNav`; UI disables orders | “Stale · orders paused” | Contract test ✔ |
| Replayed / old / far-future / jumpy NAV | Bad or reused signature | Oracle reverts | No change | Contract tests ✔ |
| Slippage | NAV moves between quote and sign | `minShares` = quote − 0.5%; revert `Slippage` | Friendly message | Contract test ✔ |
| Double submit | Double click or refresh mid-flight | In-flight lock + order id in sessionStorage; `OrderReused` revert | “Already sent” | Contract test ✔, UI lock not E2E-tested |
| Trustee can't pay | Trustee short of funds or allowance | Settlement reverts; redemption stays Pending; investor can cancel | “Pending” + Cancel | Contract test ✔ |
| Not eligible | New wallet | `NotEligible` revert; UI shows step 1 | “Confirm eligibility” | Contract test ✔ |
| DefiLlama down | Network or API error | Route returns `unavailable` per market | “Unavailable”, never a number | Unit test ✔, live call not tested |
| Price API down | CoinGecko unreachable or rate-limited | Server route, then browser direct, then `unavailable` | Dashes + warning | Fixture E2E ✔ |
| Atlas feed stale | No update for more than 6 h (holiday, oracle outage) | `decodeRound` marks stale; reconcile → `offchain-only` | "No on-chain" tag; quotes paused | Unit ✔ |
| Atlas vs CoinGecko disagree | Depeg, bad tick, or manipulation of either | `reconcile` > 2% → `disagree` | "Disagree" tag; quotes paused | Unit ✔ |
| Atlas refuses read | Whitelist mode and the call came via a contract | Never use multicall; direct eth_call only | n/a | Grep check in prompt 02 |
| Mainnet RPC down | publicnode outage | viem fallback → drpc | Dashes if both fail | Not tested |
| RPC log-range limit | Public RPC caps `getLogs` | 5k-block chunks, 40 chunks | Receipts for about a day | Not tested (no RPC in sandbox) |
| Wrong network | Wallet on another chain | NetworkGuard prompts a switch | Banner + “Switch network” | Not E2E-tested |
| Wallet hangs on reconnect | Locked MetaMask | 1.5 s patience, then gate | Gate, not an endless skeleton | Browser test ✔ |
| Contracts not deployed | Placeholder config | `isDeployed` false | Amber banner; live data still works | Browser test ✔ |

## Oracle trust note (new)

Atlas is the right price of record on BNB Chain: it is the oracle Venus and Lista use in production, and it succeeded Binance Oracle. Two limits matter:
1. **Whitelist mode.** Our future *contracts* cannot read most feeds until Atlas whitelists them. Ask Atlas for whitelisting, or a dedicated SingleFeed, before any on-chain stock product ships.
2. **bStocks ≠ xStocks.** The witness prices a different token on the same underlying. A persistent gap would be a real premium or discount, not an error. Monitor the gap; don't hide it.

## Not in scope (deferred, with reasons)

- **Real fund integration** (Halogen-style IUTA/CUTA onboarding): needs a signed agreement and a nominee or trustee structure.
- **KYC provider:** testnet self-certify stands in for it; the registry already has `COMPLIANCE_ROLE` for a real provider.
- **Multiply / looping on fund tokens:** needs a lending market that accepts the units as collateral, plus liquidation design. Too risky to demo half-built.
- **IDRX / MYR rails, BTC collateral:** partner-dependent.
- **Etherscan V2 receipts indexer, monitoring and alerts:** after the hackathon.
- **Mobile layout:** desktop first, per Sky.

## Six-month view

The contracts are deliberately boring (OpenZeppelin, no upgradeability), so an audit is cheap. The expensive parts later are the manager key ceremony (hardware or MPC signer), trustee liquidity operations, and replacing self-certify with a real compliance provider. Do these before any mainnet money, together with a full audit (see the grant and sponsor ask).

## Do first / defer / scrap

- **First:** deploy to testnet, post NAVs, run the keeper once, check that `/api/yields` shows all three markets live, rehearse the demo flow twice.
- **Defer:** everything in “Not in scope”.
- **Scrap:** any claim of real fund yields in the demo script. Say “testnet NAV, licensed manager onboarding in progress”.
