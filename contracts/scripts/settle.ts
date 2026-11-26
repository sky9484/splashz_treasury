import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Trustee settles a pending redemption: approves the payout, then calls settleRedemption.
 *   ORDER=0x… FUND=money-market npx hardhat run scripts/settle.ts --network bscTestnet
 * The signer (DEPLOYER_PRIVATE_KEY) must be the fund's trustee (it holds SETTLER_ROLE and pays out).
 */
const STATUS = ["None", "Pending", "Settled", "Cancelled"];

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", `${network.name}.json`), "utf8"));
  const fund = dep.funds.find((f: { key: string }) => f.key === process.env.FUND);
  if (!fund) throw new Error(`Unknown FUND. Use one of: ${dep.funds.map((f: { key: string }) => f.key).join(", ")}`);
  const orderId = process.env.ORDER;
  if (!orderId || !/^0x[0-9a-fA-F]{64}$/.test(orderId)) throw new Error("Set ORDER to the 32-byte order id, e.g. ORDER=0x…");

  const [signer] = await ethers.getSigners();
  const router = await ethers.getContractAt("SubscriptionRouter", fund.router);
  const usdt = await ethers.getContractAt("MockUSDT", dep.stable);
  const oracle = await ethers.getContractAt("NavOracle", fund.oracle);

  const trustee = await router.trustee();
  if (trustee.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer ${signer.address} is not the trustee (${trustee}). Run with the trustee key.`);
  }

  const r = await router.redemptions(orderId);
  if (Number(r.status) !== 1) throw new Error(`Order ${orderId} is ${STATUS[Number(r.status)] ?? r.status}, not Pending.`);

  const nav = await oracle.latestNav(); // reverts NoNav / StaleNav: post a fresh NAV first
  const payout = (r.shares * nav) / 10n ** 18n;
  const balance = await usdt.balanceOf(signer.address);
  if (balance < payout) {
    throw new Error(`Trustee holds ${ethers.formatUnits(balance, 18)} tUSDT but the payout is ${ethers.formatUnits(payout, 18)} tUSDT.`);
  }

  console.log(`fund=${fund.key} order=${orderId}`);
  console.log(`investor=${r.investor} units=${ethers.formatUnits(r.shares, 18)} nav=${ethers.formatUnits(nav, 18)}`);
  await (await usdt.approve(fund.router, payout)).wait();
  const tx = await router.settleRedemption(orderId);
  const receipt = await tx.wait();

  const settled = receipt?.logs
    .map((l) => { try { return router.interface.parseLog(l); } catch { return null; } })
    .find((e) => e?.name === "RedemptionSettled");
  const paid = settled ? (settled.args.payout as bigint) : payout;
  console.log(`settled: payout ${ethers.formatUnits(paid, 18)} tUSDT to ${r.investor}`);
  console.log(`tx ${dep.explorer ?? "https://testnet.bscscan.com"}/tx/${tx.hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
