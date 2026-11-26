# 01 · Contracts: harden, test, deploy to BSC testnet

## Goal

The six contracts in `contracts/contracts/` are correct, fully tested and deployable to BSC testnet in one command. The web config is written automatically.

## Read first

- All of `contracts/contracts/*.sol`
- `contracts/test/Treasury.test.ts`
- `contracts/scripts/*.ts`
- `contracts/hardhat.config.ts`

## Contract specs (current behaviour, keep it)

**`MockUSDT` (tUSDT, 18 decimals)**
- `faucet()` mints 10,000 tUSDT, at most once per 24 h per wallet.
- A second call inside the window reverts `FaucetCooldown(availableAt)`.

**`InvestorRegistry`**
- `isEligible(addr)` reports eligibility.
- `COMPLIANCE_ROLE` holders can call `setEligible`.
- `selfCertify()` works only while `selfCertifyEnabled` is true; otherwise it reverts `SelfCertifyDisabled`.

**`FundShare` (fund units, ERC20)**
- Only `ROUTER_ROLE` may `mint`, `burn` and `escrow`.
- `_update` blocks any transfer to a non-eligible address. The router is exempt.

**`NavOracle` (EIP-712 domain "SplashzNavOracle", version 1)**
- Accepts `NavUpdate{nav, asOf, nonce}` only when signed by `MANAGER_ROLE`.
- Rejects:
  - a reused nonce
  - `asOf` not newer than the current one
  - `asOf` more than 5 min in the future
  - `nav` of zero
  - a jump larger than `maxDeltaBps`
- `latestNav()` reverts `NoNav` or `StaleNav` once the NAV is older than `maxAge`.

**`SubscriptionRouter`**
- `quote(amount)` returns `(shares, fee, nav)`.
- `subscribe(amount, minShares, orderId)`:
  1. checks the investor is eligible
  2. checks the order id is unused
  3. checks `shares ≥ minShares`
  4. sends `amount − fee` from the investor to the trustee, and the fee to `feeRecipient`
  5. mints units
  6. emits `Subscribed`
- Redemption flow:
  - `requestRedeem(shares, orderId)` escrows the units.
  - `settleRedemption(orderId)` (`SETTLER_ROLE`) pays `shares × nav / 1e18` from the trustee.
  - `cancelRedemption(orderId)` can be called by the investor or the settler.
- Fees: `MAX_FEE_BPS` is 100.

**`StableVault` (ERC-4626, `_decimalsOffset` = 6)**
- `KEEPER_ROLE` can call `reportYield(amount)` and `setReferenceApy(bps, source)`.

## Tasks

1. **Invariant tests** (add them; keep the existing 14):
   - **Conservation:**
     - After any subscribe sequence, the router's tUSDT balance is 0.
     - The trustee's balance increase plus the fee recipient's equals the sum of amounts.
   - **Fuzz:** `subscribe` over random amounts (1 wei → 1e27) at random NAVs (0.5 → 2.0). Shares are never above `amount×1e18/nav`, and the result matches `quote`.
   - **Redemption state machine:**
     - None → Pending → Settled
     - None → Pending → Cancelled
     - Every other transition reverts `NotPending`.
   - **NAV:** a NAV exactly at `maxDeltaBps` is accepted; one wei above it is rejected.
2. **Settle script:** add `scripts/settle.ts`.
   - Usage: `ORDER=0x… FUND=money-market npx hardhat run scripts/settle.ts --network bscTestnet`
   - The trustee key calls `approve` then `settleRedemption`.
   - Print the payout.
3. **Deploy output:** `deploy.ts` already writes `deployBlock`. Also write:
   - `explorer: "https://testnet.bscscan.com"`
   - a `verify` block holding each contract's constructor args, so verification can be scripted.
4. **Verify script:** add `scripts/verify.ts`. It reads `deployments/bscTestnet.json` and runs `hardhat verify` for every contract. Skip a contract that is already verified.
5. **Scripts:** add npm scripts `settle` and `verify:testnet`.
6. **Gas report:** run `REPORT_GAS=1 npx hardhat test` and paste the table into the final report.

## Do not

- Add upgradeability, proxies or new tokens.
- Change any event signature. The web app indexes these events.
- Touch private keys. Write instructions for Sebastian instead.

## Acceptance criteria

- `npx hardhat test` passes with the new invariant and fuzz tests. Report the count.
- A local deploy (`npx hardhat run scripts/deploy.ts`) writes a config with `deployBlock`, `explorer` and `verify`.
- `README.md`'s deploy section lists `deploy:testnet → verify:testnet → post-nav → keeper → settle`, with one-line explanations.
- No change to any event or function signature the web app uses. Prove it with `git diff --stat` and a grep of `web/src/lib/abi.ts`.
