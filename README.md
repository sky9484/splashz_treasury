# Splashz Treasury · by Move Labs

Earn on idle stablecoins without leaving your wallet. Licensed funds and bonds, live stablecoin vaults and tokenized stocks, on **BNB Smart Chain**. This repo is the BNB Bangkok testnet build behind `earn.splashz.xyz`.

```
contracts/   Solidity 0.8.24 · Hardhat · OpenZeppelin 5   (14 tests)
web/         Next.js 15 · wagmi 2 · viem                 (landing at /, app at /app)
docs/        CEO review, build prompt, QA report
```

## What is real and what is not

| Piece | Status |
|---|---|
| Fund subscribe → units → redeem → settle | Real contracts on BSC testnet. NAV is EIP-712 signed by the manager key. **Fund NAVs are demo values posted by us, not real manager data.** |
| Non-custody | Subscriptions go straight from the investor to the trustee. The router's own stablecoin balance is always zero (tested). |
| Stablecoin vault | Real ERC-4626 on testnet. A keeper copies the **live Venus USDT APY** from DefiLlama on-chain and pays matching test yield. |
| Live market rates | Real mainnet data from DefiLlama: Venus USDT/USDC, Lista USD1, Aave V3 USDT (BNB Chain), Aave V3 USDC/USDT (Ethereum). Pool ids verified live 26 Nov. |
| Live prices + chain | BNB, USDT, USDC and tokenized stocks (xStocks) from CoinGecko; testnet block and gas straight from BSC testnet. Keyless. |
| Tokenized stocks | **On-chain price of record from Atlas oracle** (BNB Chain mainnet), cross-checked against CoinGecko; >2% gap pauses quotes. Buying is **disabled** until a licensed tokenizer partner is signed. |
| Receipts | Read from contract events on-chain (no database). |
| Wallet | MetaMask only (EIP-6963 `io.metamask`), chain 97. The app is gated until a wallet connects. |

## Deploy (Sebastian)

You need: Node 20+, a deployer key with tBNB (BNB Chain testnet faucet), and optionally a BscScan / Etherscan V2 API key.

```bash
# 1. Contracts
cd contracts
npm ci --legacy-peer-deps
cp .env.example .env          # fill DEPLOYER_PRIVATE_KEY and ETHERSCAN_API_KEY (never commit .env)
npm test                      # 21 passing (14 behaviour + 7 invariant/fuzz)
```

Then run these in order, all against BSC testnet:

| Step | Command | What it does |
|---|---|---|
| 1 | `npm run deploy:testnet` | Deploys all 12 contracts and writes `deployments/bscTestnet.json` and `web/src/config/deployment.bscTestnet.json` (addresses, `deployBlock`, `explorer`, constructor args). |
| 2 | `npm run verify:testnet` | Verifies every contract on BscScan from the `verify` block in the deployment file. Skips ones already verified. |
| 3 | `FUND=money-market NAV=1.0004 npm run post-nav` | Signs and posts a fresh NAV for one fund. Repeat per fund. Orders pause when a NAV is older than 7 days, so run it daily. |
| 4 | `npm run keeper` | Copies the live Venus USDT APY on-chain and pays one hour of yield into the vault. Run it hourly from cron. |
| 5 | `ORDER=0x… FUND=money-market npm run settle` | The trustee approves the payout and settles one pending redemption at the current NAV. Prints the payout. |

```bash
# Web
cd ../web
npm ci --legacy-peer-deps
cp .env.example .env.local    # all optional; COINGECKO_API_KEY (free demo key) raises rate limits
npm run build && npm start    # serve on earn.splashz.xyz
```

Commit the generated `web/src/config/deployment.bscTestnet.json` after deploying so the site points at the new contracts.

**Keys:** the deploy key is the contracts' admin, manager and trustee by default. For anything beyond a demo, set `MANAGER_ADDRESS`, `TRUSTEE_ADDRESS` and `FEE_RECIPIENT` to separate wallets.

## How live data stays live

Every feed tries our server route first (cached), then calls the public API straight from the visitor's browser, then shows “unavailable”. Never a guess.

| Feed | Server route | Browser fallback |
|---|---|---|
| Vault APYs | `/api/yields` | `yields.llama.fi/chart/{pool}` |
| Stocks (record) | n/a | Atlas SingleFeeds via `bsc-rpc.publicnode.com` → `bsc.drpc.org` (direct eth_call, never multicall) |
| Stocks (witness) | `/api/stocks` | `api.coingecko.com/simple/price` |
| BNB / USDT / USDC | `/api/market` | same |
| Block, gas, contract reads | n/a | `bsc-testnet-rpc.publicnode.com`, then `bsc-testnet.drpc.org` |

The official `data-seed-prebsc…bnbchain.org` RPCs **reject browser requests**, so they are not used by the web app. For demo day, set `NEXT_PUBLIC_BSC_TESTNET_RPC` to a private RPC.

## Themes

**Cobalt is the chosen theme** (Sky, 26 Nov). Alternate tokens (`midnight`, `azure`, `splash`, `emerald`) exist in `globals.css` but are not used.

Build with Claude Code using `docs/claude-code/` (six prompts, run in order). See `docs/QA_REPORT.md` for what was and was not tested.
