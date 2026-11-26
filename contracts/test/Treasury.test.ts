import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const E18 = 10n ** 18n;
const id = (s: string) => ethers.id(s);

async function signNav(oracle: any, signer: HardhatEthersSigner, nav: bigint, asOf: number, nonce: number) {
  const { chainId } = await ethers.provider.getNetwork();
  const domain = { name: "SplashzNavOracle", version: "1", chainId, verifyingContract: await oracle.getAddress() };
  const types = { NavUpdate: [{ name: "nav", type: "uint256" }, { name: "asOf", type: "uint64" }, { name: "nonce", type: "uint64" }] };
  const value = { nav, asOf, nonce };
  return { value, sig: await signer.signTypedData(domain, types, value) };
}

async function deploy() {
  const [admin, manager, trustee, feeTo, alice, bob, mallory] = await ethers.getSigners();
  const usdt = await (await ethers.getContractFactory("MockUSDT")).deploy(admin.address);
  const registry = await (await ethers.getContractFactory("InvestorRegistry")).deploy(admin.address, true);
  const share = await (await ethers.getContractFactory("FundShare")).deploy("Shariah Income Fund", "SIF", await registry.getAddress(), admin.address);
  const oracle = await (await ethers.getContractFactory("NavOracle")).deploy(admin.address, manager.address, 3 * 24 * 3600, 500);
  const router = await (await ethers.getContractFactory("SubscriptionRouter")).deploy(
    await usdt.getAddress(), await share.getAddress(), await oracle.getAddress(), await registry.getAddress(),
    trustee.address, feeTo.address, 25, admin.address,
  );
  await share.grantRole(await share.ROUTER_ROLE(), await router.getAddress());
  const vault = await (await ethers.getContractFactory("StableVault")).deploy(await usdt.getAddress(), admin.address, admin.address);

  const now = await time.latest();
  const first = await signNav(oracle, manager, (1025n * E18) / 1000n, now, 0); // NAV 1.025
  await oracle.submit(first.value, first.sig);

  for (const s of [alice, bob, mallory]) await usdt.connect(s).faucet();
  return { admin, manager, trustee, feeTo, alice, bob, mallory, usdt, registry, share, oracle, router, vault };
}

describe("MockUSDT", () => {
  it("faucet pays once per day and reverts inside the cooldown", async () => {
    const { usdt, alice } = await deploy();
    expect(await usdt.balanceOf(alice.address)).to.equal(10_000n * E18);
    await expect(usdt.connect(alice).faucet()).to.be.revertedWithCustomError(usdt, "FaucetCooldown");
    await time.increase(24 * 3600);
    await usdt.connect(alice).faucet();
    expect(await usdt.balanceOf(alice.address)).to.equal(20_000n * E18);
  });
});

describe("NavOracle", () => {
  it("rejects a non-manager signature", async () => {
    const { oracle, mallory } = await deploy();
    const u = await signNav(oracle, mallory, E18, (await time.latest()) + 1, 1);
    await expect(oracle.submit(u.value, u.sig)).to.be.revertedWithCustomError(oracle, "BadSigner");
  });

  it("rejects replayed nonce, older timestamp, future timestamp and big jumps", async () => {
    const { oracle, manager } = await deploy();
    const t = await time.latest();
    const replay = await signNav(oracle, manager, E18, t + 10, 0);
    await expect(oracle.submit(replay.value, replay.sig)).to.be.revertedWithCustomError(oracle, "BadNonce");
    const older = await signNav(oracle, manager, E18, t - 10, 1);
    await expect(oracle.submit(older.value, older.sig)).to.be.revertedWithCustomError(oracle, "NotNewer");
    const future = await signNav(oracle, manager, E18, t + 3600, 1);
    await expect(oracle.submit(future.value, future.sig)).to.be.revertedWithCustomError(oracle, "FromFuture");
    const jump = await signNav(oracle, manager, 2n * E18, t + 10, 1); // +95%, cap is 5%
    await expect(oracle.submit(jump.value, jump.sig)).to.be.revertedWithCustomError(oracle, "JumpTooLarge");
  });

  it("goes stale after maxAge and blocks pricing", async () => {
    const { oracle, router, alice, usdt, registry } = await deploy();
    await registry.connect(alice).selfCertify();
    await time.increase(3 * 24 * 3600 + 1);
    await expect(oracle.latestNav()).to.be.revertedWithCustomError(oracle, "StaleNav");
    await usdt.connect(alice).approve(await router.getAddress(), 1000n * E18);
    await expect(router.connect(alice).subscribe(1000n * E18, 0, id("o1"))).to.be.revertedWithCustomError(oracle, "StaleNav");
  });
});

describe("SubscriptionRouter", () => {
  it("subscribes: money goes to the trustee, fee to fee recipient, units to the investor; router holds nothing", async () => {
    const { router, usdt, share, registry, alice, trustee, feeTo } = await deploy();
    await registry.connect(alice).selfCertify();
    const amount = 3000n * E18;
    await usdt.connect(alice).approve(await router.getAddress(), amount);
    const [shares, fee, nav] = await router.quote(amount);
    expect(fee).to.equal((amount * 25n) / 10_000n);

    await expect(router.connect(alice).subscribe(amount, shares, id("order-1")))
      .to.emit(router, "Subscribed")
      .withArgs(id("order-1"), alice.address, amount, fee, shares, nav, trustee.address);

    expect(await usdt.balanceOf(trustee.address)).to.equal(amount - fee);
    expect(await usdt.balanceOf(feeTo.address)).to.equal(fee);
    expect(await usdt.balanceOf(await router.getAddress())).to.equal(0n);
    expect(await share.balanceOf(alice.address)).to.equal(shares);
    // conservation: investor paid exactly amount
    expect(await usdt.balanceOf(alice.address)).to.equal(10_000n * E18 - amount);
  });

  it("blocks ineligible investors, reused order ids, zero amounts and slippage", async () => {
    const { router, usdt, registry, alice, bob } = await deploy();
    await usdt.connect(bob).approve(await router.getAddress(), 1000n * E18);
    await expect(router.connect(bob).subscribe(1000n * E18, 0, id("x"))).to.be.revertedWithCustomError(router, "NotEligible");

    await registry.connect(alice).selfCertify();
    await usdt.connect(alice).approve(await router.getAddress(), 5000n * E18);
    await router.connect(alice).subscribe(1000n * E18, 0, id("dup"));
    await expect(router.connect(alice).subscribe(1000n * E18, 0, id("dup"))).to.be.revertedWithCustomError(router, "OrderReused");
    await expect(router.connect(alice).subscribe(0, 0, id("zero"))).to.be.revertedWithCustomError(router, "ZeroAmount");
    const [shares] = await router.quote(1000n * E18);
    await expect(router.connect(alice).subscribe(1000n * E18, shares + 1n, id("slip"))).to.be.revertedWithCustomError(router, "Slippage");
  });

  it("caps the fee at 1%", async () => {
    const { router, feeTo } = await deploy();
    await expect(router.setFee(101, feeTo.address)).to.be.revertedWithCustomError(router, "FeeTooHigh");
  });

  it("redeems: escrow, settle at NAV from the trustee, units burned", async () => {
    const { router, usdt, share, registry, alice, trustee, oracle, manager } = await deploy();
    await registry.connect(alice).selfCertify();
    await usdt.connect(alice).approve(await router.getAddress(), 2000n * E18);
    await router.connect(alice).subscribe(2000n * E18, 0, id("s"));
    const units = await share.balanceOf(alice.address);

    await expect(router.connect(alice).requestRedeem(units, id("r1"))).to.emit(router, "RedemptionRequested").withArgs(id("r1"), alice.address, units);
    expect(await share.balanceOf(alice.address)).to.equal(0n);

    // NAV rises 1% before settlement
    const u = await signNav(oracle, manager, (1025n * E18 * 101n) / 100_000n, (await time.latest()) + 1, 1);
    await oracle.submit(u.value, u.sig);
    const nav = await oracle.latestNav();
    const payout = (units * nav) / E18;
    await usdt.mint(trustee.address, 100n * E18); // fund returns land in the trustee account
    await usdt.connect(trustee).approve(await router.getAddress(), payout);
    const before = await usdt.balanceOf(alice.address);
    await expect(router.connect(trustee).settleRedemption(id("r1"))).to.emit(router, "RedemptionSettled");
    expect(await usdt.balanceOf(alice.address)).to.equal(before + payout);
    expect(await share.totalSupply()).to.equal(0n);
    await expect(router.connect(trustee).settleRedemption(id("r1"))).to.be.revertedWithCustomError(router, "NotPending");
  });

  it("settlement fails loudly if the trustee cannot pay, and the redemption stays pending", async () => {
    const { router, usdt, share, registry, alice, trustee } = await deploy();
    await registry.connect(alice).selfCertify();
    await usdt.connect(alice).approve(await router.getAddress(), 1000n * E18);
    await router.connect(alice).subscribe(1000n * E18, 0, id("s"));
    await router.connect(alice).requestRedeem(await share.balanceOf(alice.address), id("r"));
    await expect(router.connect(trustee).settleRedemption(id("r"))).to.be.revertedWithCustomError(usdt, "ERC20InsufficientAllowance");
    const r = await router.redemptions(id("r"));
    expect(r.status).to.equal(1n); // Pending
  });

  it("only the settler settles; investor can cancel a pending redemption", async () => {
    const { router, usdt, share, registry, alice, mallory } = await deploy();
    await registry.connect(alice).selfCertify();
    await usdt.connect(alice).approve(await router.getAddress(), 1000n * E18);
    await router.connect(alice).subscribe(1000n * E18, 0, id("s"));
    const units = await share.balanceOf(alice.address);
    await router.connect(alice).requestRedeem(units, id("r"));
    await expect(router.connect(mallory).settleRedemption(id("r"))).to.be.revertedWithCustomError(router, "AccessControlUnauthorizedAccount");
    await expect(router.connect(mallory).cancelRedemption(id("r"))).to.be.revertedWithCustomError(router, "NotInvestor");
    await expect(router.connect(alice).cancelRedemption(id("r"))).to.emit(router, "RedemptionCancelled");
    expect(await share.balanceOf(alice.address)).to.equal(units);
  });
});

describe("FundShare transfer rules", () => {
  it("units move only between eligible investors", async () => {
    const { router, usdt, share, registry, alice, bob } = await deploy();
    await registry.connect(alice).selfCertify();
    await usdt.connect(alice).approve(await router.getAddress(), 1000n * E18);
    await router.connect(alice).subscribe(1000n * E18, 0, id("s"));
    await expect(share.connect(alice).transfer(bob.address, 1n)).to.be.revertedWithCustomError(share, "NotEligible");
    await registry.connect(bob).selfCertify();
    await share.connect(alice).transfer(bob.address, 1n);
    expect(await share.balanceOf(bob.address)).to.equal(1n);
  });

  it("self-certify can be switched off for production", async () => {
    const { registry, mallory } = await deploy();
    await registry.setSelfCertify(false);
    await expect(registry.connect(mallory).selfCertify()).to.be.revertedWithCustomError(registry, "SelfCertifyDisabled");
  });
});

describe("StableVault", () => {
  it("deposit, keeper yield, withdraw more than deposited; shares stay with the user", async () => {
    const { vault, usdt, alice, admin } = await deploy();
    await usdt.connect(alice).approve(await vault.getAddress(), 1000n * E18);
    await vault.connect(alice).deposit(1000n * E18, alice.address);
    const shares = await vault.balanceOf(alice.address);
    expect(shares).to.be.gt(0n);

    await usdt.mint(admin.address, 10n * E18);
    await usdt.approve(await vault.getAddress(), 10n * E18);
    await expect(vault.reportYield(10n * E18)).to.emit(vault, "YieldReported");
    await vault.setReferenceApy(419, "DefiLlama 9f3a6015 Venus Core Pool USDT (BSC)");
    expect(await vault.referenceApyBps()).to.equal(419n);

    const maxOut = await vault.maxWithdraw(alice.address);
    expect(maxOut).to.be.gt(1000n * E18);
    await vault.connect(alice).redeem(shares, alice.address, alice.address);
    expect(await usdt.balanceOf(alice.address)).to.be.gt(10_000n * E18 - 1n);
  });

  it("only the keeper reports yield", async () => {
    const { vault, mallory } = await deploy();
    await expect(vault.connect(mallory).reportYield(1n)).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
  });
});
