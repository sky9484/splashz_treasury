import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Fund administrator signs and submits a new NAV.
 *   FUND=shariah-income NAV=1.0262 npx hardhat run scripts/post-nav.ts --network bscTestnet
 * The signer (DEPLOYER_PRIVATE_KEY) must hold MANAGER_ROLE on the fund's NavOracle.
 */
async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", `${network.name}.json`), "utf8"));
  const fund = dep.funds.find((f: { key: string }) => f.key === process.env.FUND);
  if (!fund) throw new Error(`Unknown FUND. Use one of: ${dep.funds.map((f: { key: string }) => f.key).join(", ")}`);
  if (!process.env.NAV) throw new Error("Set NAV, e.g. NAV=1.0262");
  const [signer] = await ethers.getSigners();
  const oracle = await ethers.getContractAt("NavOracle", fund.oracle);
  const { chainId } = await ethers.provider.getNetwork();
  const value = { nav: ethers.parseUnits(process.env.NAV, 18), asOf: Math.floor(Date.now() / 1000) - 30, nonce: Number(await oracle.nextNonce()) };
  const sig = await signer.signTypedData(
    { name: "SplashzNavOracle", version: "1", chainId, verifyingContract: fund.oracle },
    { NavUpdate: [{ name: "nav", type: "uint256" }, { name: "asOf", type: "uint64" }, { name: "nonce", type: "uint64" }] },
    value,
  );
  const tx = await oracle.submit(value, sig);
  console.log(`NAV ${process.env.NAV} posted for ${fund.key}: ${tx.hash}`);
  await tx.wait();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
