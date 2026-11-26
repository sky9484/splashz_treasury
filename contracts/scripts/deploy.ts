import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Deploys the Splashz treasury demo to the selected network.
 *   npx hardhat run scripts/deploy.ts --network bscTestnet
 * Writes deployments/<network>.json and ../web/src/config/deployment.<network>.json
 *
 * Roles (set via env, default = deployer for a solo testnet demo):
 *   MANAGER_ADDRESS  signs NAV updates (fund administrator)
 *   TRUSTEE_ADDRESS  receives subscriptions, settles redemptions
 *   FEE_RECIPIENT    receives the Splashz platform fee
 */
const FUNDS = [
  { key: "shariah-income", name: "Shariah Income Fund", symbol: "SIF", navE18: "1.0250", market: "Malaysia", ccy: "USD (testnet)" },
  { key: "money-market", name: "Money Market Fund", symbol: "MMF", navE18: "1.0000", market: "Malaysia", ccy: "USD (testnet)" },
  { key: "govt-bond", name: "Government Bond Fund", symbol: "GBF", navE18: "0.9850", market: "Indonesia", ccy: "USD (testnet)" },
];

async function main() {
  // First block of this deployment, so receipts never scan history before the contracts existed.
  const deployBlock = await ethers.provider.getBlockNumber();
  const [deployer] = await ethers.getSigners();
  const manager = process.env.MANAGER_ADDRESS || deployer.address;
  const trustee = process.env.TRUSTEE_ADDRESS || deployer.address;
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  const feeBps = Number(process.env.FEE_BPS || 25);
  console.log(`network=${network.name} deployer=${deployer.address}`);

  // Constructor args of every contract, so scripts/verify.ts can verify without guessing.
  type VerifyArg = string | number | boolean;
  const verify: { name: string; contract: string; address: string; args: VerifyArg[] }[] = [];
  const record = async (name: string, file: string, c: { getAddress(): Promise<string> }, args: VerifyArg[]) =>
    verify.push({ name, contract: `contracts/${file}.sol:${file}`, address: await c.getAddress(), args });

  const usdt = await (await ethers.getContractFactory("MockUSDT")).deploy(deployer.address);
  await usdt.waitForDeployment();
  await record("MockUSDT", "MockUSDT", usdt, [deployer.address]);
  const registry = await (await ethers.getContractFactory("InvestorRegistry")).deploy(deployer.address, true);
  await registry.waitForDeployment();
  await record("InvestorRegistry", "InvestorRegistry", registry, [deployer.address, true]);

  const funds: Record<string, unknown>[] = [];
  for (const f of FUNDS) {
    const share = await (await ethers.getContractFactory("FundShare")).deploy(f.name, f.symbol, await registry.getAddress(), deployer.address);
    await share.waitForDeployment();
    await record(`FundShare ${f.key}`, "FundShare", share, [f.name, f.symbol, await registry.getAddress(), deployer.address]);
    const oracle = await (await ethers.getContractFactory("NavOracle")).deploy(deployer.address, manager, 7 * 24 * 3600, 500);
    await oracle.waitForDeployment();
    await record(`NavOracle ${f.key}`, "NavOracle", oracle, [deployer.address, manager, 7 * 24 * 3600, 500]);
    const routerArgs = [
      await usdt.getAddress(), await share.getAddress(), await oracle.getAddress(), await registry.getAddress(),
      trustee, feeRecipient, feeBps, deployer.address,
    ] as const;
    const router = await (await ethers.getContractFactory("SubscriptionRouter")).deploy(...routerArgs);
    await router.waitForDeployment();
    await record(`SubscriptionRouter ${f.key}`, "SubscriptionRouter", router, [...routerArgs]);
    await (await share.grantRole(await share.ROUTER_ROLE(), await router.getAddress())).wait();

    // First NAV: only possible here when the deployer is also the manager. Otherwise run scripts/post-nav.ts.
    if (manager.toLowerCase() === deployer.address.toLowerCase()) {
      const { chainId } = await ethers.provider.getNetwork();
      const nav = ethers.parseUnits(f.navE18, 18);
      const value = { nav, asOf: Math.floor(Date.now() / 1000) - 60, nonce: 0 };
      const sig = await deployer.signTypedData(
        { name: "SplashzNavOracle", version: "1", chainId, verifyingContract: await oracle.getAddress() },
        { NavUpdate: [{ name: "nav", type: "uint256" }, { name: "asOf", type: "uint64" }, { name: "nonce", type: "uint64" }] },
        value,
      );
      await (await oracle.submit(value, sig)).wait();
    }
    funds.push({ ...f, share: await share.getAddress(), oracle: await oracle.getAddress(), router: await router.getAddress() });
    console.log(`fund ${f.key}: router=${await router.getAddress()}`);
  }

  const vault = await (await ethers.getContractFactory("StableVault")).deploy(await usdt.getAddress(), deployer.address, deployer.address);
  await vault.waitForDeployment();
  await record("StableVault", "StableVault", vault, [await usdt.getAddress(), deployer.address, deployer.address]);

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployBlock,
    explorer: "https://testnet.bscscan.com",
    roles: { deployer: deployer.address, manager, trustee, feeRecipient, feeBps },
    stable: await usdt.getAddress(),
    registry: await registry.getAddress(),
    vault: await vault.getAddress(),
    funds,
    verify,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));
  const webCfg = path.join(__dirname, "..", "..", "web", "src", "config");
  if (fs.existsSync(webCfg)) fs.writeFileSync(path.join(webCfg, `deployment.${network.name}.json`), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
