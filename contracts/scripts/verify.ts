import hre, { network } from "hardhat";
import fs from "fs";
import path from "path";
import { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan";

/**
 * Verifies every contract in deployments/<network>.json on BscScan (Etherscan API V2).
 *   npx hardhat run scripts/verify.ts --network bscTestnet
 * Needs ETHERSCAN_API_KEY in .env. Contracts that are already verified are skipped.
 */
type Entry = { name: string; contract: string; address: string; args: (string | number | boolean)[] };

async function main() {
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));
  const entries: Entry[] = dep.verify ?? [];
  if (entries.length === 0) throw new Error(`${file} has no "verify" block. Redeploy with the current scripts/deploy.ts.`);
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error("Set ETHERSCAN_API_KEY in contracts/.env (an Etherscan V2 key works for BscScan).");

  const { chainId } = await hre.ethers.provider.getNetwork();
  const etherscan = new Etherscan(apiKey, "https://api.etherscan.io/v2/api", "https://testnet.bscscan.com", Number(chainId));

  let verified = 0, skipped = 0, failed = 0;
  for (const e of entries) {
    if (await etherscan.isVerified(e.address).catch(() => false)) {
      console.log(`skip     ${e.name} ${e.address} (already verified)`);
      skipped++;
      continue;
    }
    try {
      await hre.run("verify:verify", { address: e.address, constructorArguments: e.args, contract: e.contract });
      console.log(`verified ${e.name} ${e.address}`);
      verified++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already verified/i.test(msg)) {
        console.log(`skip     ${e.name} ${e.address} (already verified)`);
        skipped++;
      } else {
        console.error(`FAILED   ${e.name} ${e.address}: ${msg.split("\n")[0]}`);
        failed++;
      }
    }
  }
  console.log(`done: ${verified} verified, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
