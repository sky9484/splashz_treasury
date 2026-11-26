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
| Live market rates | Real mainnet data from DefiLlama (Venus USDT, Venus USDC, Aave V3 USDC). If a source fails, the UI says “unavailable”. |
| Tokenized stocks | Live Pyth prices (needs `PYTH_API_KEY`). Buying is **disabled** until a licensed tokenizer partner is signed. |
| Receipts | Read from contract events on-chain (no database). |
| Wallet | MetaMask only (EIP-6963 `io.metamask`), chain 97. The app is gated until a wallet connects. |

## Deploy (Sebastian)

You need: Node 20+, a deployer key with tBNB (BNB Chain testnet faucet), and optionally a BscScan / Etherscan V2 API key.

```bash
# 1. Contracts
cd contracts
npm ci --legacy-peer-deps
cp .env.example .env          # fill DEPLOYER_PRIVATE_KEY (never commit .env)
npm test                      # 14 passing
npm run deploy:testnet        # writes deployments/bscTestnet.json and web/src/config/deployment.bscTestnet.json

# 2. Verify on BscScan (optional, repeat per contract)
npx hardhat verify --network bscTestnet <address> <constructor args…>

# 3. Fresh NAV (oracle rejects NAVs older than 7 days, orders pause when stale)
FUND=money-market NAV=1.0004 npm run post-nav

# 4. Keeper (hourly cron): copies live Venus USDT APY on-chain and pays the yield
npm run keeper

# 5. Web
cd ../web
npm ci --legacy-peer-deps
cp .env.example .env.local    # PYTH_API_KEY, ETHERSCAN_API_KEY are optional
npm run build && npm start    # or deploy the Next.js app to earn.splashz.xyz
```

Commit the generated `web/src/config/deployment.bscTestnet.json` after deploying so the site points at the new contracts.

**Keys:** the deploy key is the contracts' admin, manager and trustee by default. For anything beyond a demo, set `MANAGER_ADDRESS`, `TRUSTEE_ADDRESS` and `FEE_RECIPIENT` to separate wallets.

## Verify before you rely on it

- The Aave V3 USDC DefiLlama pool id in `web/src/lib/yields.ts` was not verified live from this build environment. Open `/api/yields` after deploy and check all three markets say `"status": "live"`.
- Pyth equity feed ids in `web/src/lib/stocks.ts` came from Pyth's public list. Check them against Pyth Terminal.
- Fonts load from Fontshare (Cabinet Grotesk, Satoshi). Without network access they fall back to system fonts.

See `docs/QA_REPORT.md` for what was and was not tested.
