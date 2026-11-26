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
| D7 | Stocks | Live Pyth prices, order button disabled | Default; tokenized stocks are securities |
| D8 | Receipts | Read from chain events, chunked RPC scan (~1 day) | Default; Etherscan V2 indexing deferred |
| D9 | Hosting | Sebastian publishes to earn.splashz.xyz, not Vercel | Approved by Sky |

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
Next.js server: /api/yields (DefiLlama) · /api/stocks (Pyth) · /api/receipts (RPC logs)
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
| No Pyth key | Env missing | `no_key` status | Warning + dashes | Build ✔, live call not tested |
| RPC log-range limit | Public RPC caps `getLogs` | 5k-block chunks, 40 chunks | Receipts for about a day | Not tested (no RPC in sandbox) |
| Wrong network | Wallet on another chain | NetworkGuard prompts a switch | Banner + “Switch network” | Not E2E-tested |
| Wallet hangs on reconnect | Locked MetaMask | 1.5 s patience, then gate | Gate, not an endless skeleton | Browser test ✔ |
| Contracts not deployed | Placeholder config | `isDeployed` false | Amber banner; live data still works | Browser test ✔ |

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
