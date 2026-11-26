import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Testnet keeper: mirrors a live mainnet stablecoin rate into StableVault.
 *  1. Reads the DefiLlama pool (default: Venus Core Pool USDT on BSC).
 *  2. Records the reference APY on-chain (setReferenceApy).
 *  3. Pays in one hour of yield at that rate on current assets (reportYield).
 * Run hourly:  npx hardhat run scripts/keeper.ts --network bscTestnet
 */
const POOL = process.env.REFERENCE_POOL_ID || "9f3a6015-5045-4471-ba65-ad3dc7c38269";
const LLAMA = process.env.DEFILLAMA_YIELDS_URL || "https://yields.llama.fi";

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", `${network.name}.json`), "utf8"));
  const res = await fetch(`${LLAMA}/chart/${POOL}`);
  if (!res.ok) throw new Error(`DefiLlama ${res.status}`);
  const body = (await res.json()) as { data: { apy: number; timestamp: string }[] };
  const last = body.data.at(-1);
  if (!last || typeof last.apy !== "number") throw new Error("No APY in DefiLlama response");
  const apyBps = Math.round(last.apy * 100);

  const vault = await ethers.getContractAt("StableVault", dep.vault);
  const usdt = await ethers.getContractAt("MockUSDT", dep.stable);
  await (await vault.setReferenceApy(apyBps, `DefiLlama ${POOL} @ ${last.timestamp}`)).wait();

  const assets = await vault.totalAssets();
  const hourly = (assets * BigInt(apyBps)) / 10_000n / (365n * 24n);
  if (hourly > 0n) {
    const [keeper] = await ethers.getSigners();
    await (await usdt.mint(keeper.address, hourly)).wait();
    await (await usdt.approve(dep.vault, hourly)).wait();
    await (await vault.reportYield(hourly)).wait();
  }
  console.log(`reference APY ${last.apy.toFixed(2)}% (${apyBps} bps); yield paid ${ethers.formatUnits(hourly, 18)} tUSDT`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
