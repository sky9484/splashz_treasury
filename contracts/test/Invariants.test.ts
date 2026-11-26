import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
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

async function postNav(oracle: any, manager: HardhatEthersSigner, nav: bigint) {
  const asOf = Math.max(Number(await oracle.asOf()) + 1, await time.latest());
  const u = await signNav(oracle, manager, nav, asOf, Number(await oracle.nextNonce()));
  return oracle.submit(u.value, u.sig);
}

async function fixture() {
  const [admin, manager, trustee, feeTo, alice, bob, carol] = await ethers.getSigners();
  const usdt = await (await ethers.getContractFactory("MockUSDT")).deploy(admin.address);
  const registry = await (await ethers.getContractFactory("InvestorRegistry")).deploy(admin.address, true);
  const share = await (await ethers.getContractFactory("FundShare")).deploy("Money Market Fund", "MMF", await registry.getAddress(), admin.address);
  const oracle = await (await ethers.getContractFactory("NavOracle")).deploy(admin.address, manager.address, 7 * 24 * 3600, 500);
  const router = await (await ethers.getContractFactory("SubscriptionRouter")).deploy(
    await usdt.getAddress(), await share.getAddress(), await oracle.getAddress(), await registry.getAddress(),
    trustee.address, feeTo.address, 25, admin.address,
  );
  await share.grantRole(await share.ROUTER_ROLE(), await router.getAddress());
  await postNav(oracle, manager, (1025n * E18) / 1000n); // NAV 1.025
  for (const s of [alice, bob, carol]) await registry.connect(s).selfCertify();
  return { admin, manager, trustee, feeTo, alice, bob, carol, usdt, registry, share, oracle, router };
}

/** Deterministic PRNG (mulberry32) so a failing fuzz run can be replayed with FUZZ_SEED. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randBig = (rnd: () => number, lo: bigint, hi: bigint) => {
  // uniform-ish over [lo, hi] using 4 × 32-bit draws (enough for 1e27 < 2^90)
  let r = 0n;
  for (let i = 0; i < 4; i++) r = (r << 32n) | BigInt(Math.floor(rnd() * 4294967296));
  return lo + (r % (hi - lo + 1n));
};
/** Log-uniform amount in [1 wei, 1e27] so tiny, typical and huge orders are all exercised. */
const randAmount = (rnd: () => number) => {
  const digits = 1 + Math.floor(rnd() * 27); // 1..27
  return randBig(rnd, 1n, 10n ** BigInt(digits));
};

describe("Invariants: conservation", () => {
  it("after any subscribe sequence the router holds 0 tUSDT and trustee + fee recipient received exactly the sum of amounts", async () => {
    const { admin, manager, trustee, feeTo, alice, bob, carol, usdt, oracle, router } = await loadFixture(fixture);
    const rnd = prng(Number(process.env.FUZZ_SEED ?? 1));
    const investors = [alice, bob, carol];
    const routerAddr = await router.getAddress();
    const trustee0 = await usdt.balanceOf(trustee.address);
    const fee0 = await usdt.balanceOf(feeTo.address);
    let sum = 0n, feeSum = 0n;

    for (let i = 0; i < 25; i++) {
      if (i % 5 === 4) await postNav(oracle, manager, ((await oracle.nav()) * BigInt(9800 + Math.floor(rnd() * 400))) / 10_000n);
      const who = investors[Math.floor(rnd() * investors.length)];
      const amount = randBig(rnd, 1n * E18, 50_000n * E18);
      await usdt.connect(admin).mint(who.address, amount);
      await usdt.connect(who).approve(routerAddr, amount);
      const [, fee] = await router.quote(amount);
      await router.connect(who).subscribe(amount, 0, id(`c-${i}`));
      sum += amount;
      feeSum += fee;
      expect(await usdt.balanceOf(routerAddr)).to.equal(0n);
    }

    const trusteeGain = (await usdt.balanceOf(trustee.address)) - trustee0;
    const feeGain = (await usdt.balanceOf(feeTo.address)) - fee0;
    expect(trusteeGain + feeGain).to.equal(sum);
    expect(feeGain).to.equal(feeSum);
    expect(await usdt.balanceOf(routerAddr)).to.equal(0n);
  });
});

describe("Invariants: fuzz subscribe", () => {
  it("over random amounts (1 wei to 1e27) and NAVs (0.5 to 2.0): shares never exceed amount*1e18/nav and always match quote", async () => {
    const { admin, manager, alice, usdt, oracle, router } = await loadFixture(fixture);
    await oracle.connect(admin).setParams(7 * 24 * 3600, 65_535); // let the fuzz jump NAV anywhere in range
    const seed = Number(process.env.FUZZ_SEED ?? 97);
    const runs = Number(process.env.FUZZ_RUNS ?? 120);
    const rnd = prng(seed);
    const routerAddr = await router.getAddress();
    await usdt.connect(admin).mint(alice.address, 10n ** 27n * BigInt(runs));
    await usdt.connect(alice).approve(routerAddr, ethers.MaxUint256);
    let minted = 0, dust = 0;

    for (let i = 0; i < runs; i++) {
      // i=0: 1 wei at NAV 2.0 (buys 0 units); i=1: 1e27 at NAV 0.5 (most units); then random
      const nav = i === 0 ? 2n * E18 : i === 1 ? E18 / 2n : randBig(rnd, E18 / 2n, 2n * E18);
      await postNav(oracle, manager, nav);
      const amount = i === 0 ? 1n : i === 1 ? 10n ** 27n : randAmount(rnd);
      const [qShares, qFee, qNav] = await router.quote(amount);
      expect(qNav).to.equal(nav);
      expect(qShares).to.be.lte((amount * E18) / nav, `seed=${seed} i=${i} amount=${amount} nav=${nav}`);

      const orderId = id(`f-${seed}-${i}`);
      if (qShares === 0n) {
        // Too small to buy one unit at this NAV: the router refuses rather than take money for nothing.
        await expect(router.connect(alice).subscribe(amount, 0, orderId))
          .to.be.revertedWithCustomError(router, "Slippage").withArgs(0, 0);
        dust++;
        continue;
      }
      await expect(router.connect(alice).subscribe(amount, qShares, orderId))
        .to.emit(router, "Subscribed")
        .withArgs(orderId, alice.address, amount, qFee, qShares, nav, await router.trustee());
      expect(await usdt.balanceOf(routerAddr)).to.equal(0n);
      minted++;
    }
    expect(minted).to.be.gt(runs / 2); // the run actually exercised the happy path
    expect(dust).to.be.gte(1); // and the 1-wei edge
  });
});

describe("Invariants: redemption state machine", () => {
  async function pending() {
    const f = await loadFixture(fixture);
    const routerAddr = await f.router.getAddress();
    await f.usdt.connect(f.alice).faucet();
    await f.usdt.connect(f.alice).approve(routerAddr, 1000n * E18);
    await f.router.connect(f.alice).subscribe(1000n * E18, 0, id("sub"));
    const units = await f.share.balanceOf(f.alice.address);
    await f.router.connect(f.alice).requestRedeem(units, id("r"));
    // trustee can always pay in these tests
    await f.usdt.connect(f.trustee).approve(routerAddr, ethers.MaxUint256);
    return { ...f, units };
  }
  const status = async (router: any, o: string) => Number((await router.redemptions(o)).status);

  it("None: settle and cancel revert NotPending", async () => {
    const { router, trustee, alice } = await loadFixture(fixture);
    expect(await status(router, id("nope"))).to.equal(0);
    await expect(router.connect(trustee).settleRedemption(id("nope"))).to.be.revertedWithCustomError(router, "NotPending");
    await expect(router.connect(alice).cancelRedemption(id("nope"))).to.be.revertedWithCustomError(router, "NotPending");
  });

  it("None -> Pending -> Settled; from Settled every transition reverts", async () => {
    const { router, trustee, alice } = await pending();
    expect(await status(router, id("r"))).to.equal(1);
    await router.connect(trustee).settleRedemption(id("r"));
    expect(await status(router, id("r"))).to.equal(2);
    await expect(router.connect(trustee).settleRedemption(id("r"))).to.be.revertedWithCustomError(router, "NotPending");
    await expect(router.connect(alice).cancelRedemption(id("r"))).to.be.revertedWithCustomError(router, "NotPending");
    await expect(router.connect(trustee).cancelRedemption(id("r"))).to.be.revertedWithCustomError(router, "NotPending");
    // the order id cannot be reused to re-enter Pending
    await expect(router.connect(alice).requestRedeem(1n, id("r"))).to.be.revertedWithCustomError(router, "OrderReused");
  });

  it("None -> Pending -> Cancelled (by investor or settler); from Cancelled every transition reverts", async () => {
    for (const by of ["alice", "trustee"] as const) {
      const f = await pending();
      const { router, trustee, alice, share, units } = f;
      await router.connect(f[by]).cancelRedemption(id("r"));
      expect(await status(router, id("r"))).to.equal(3);
      expect(await share.balanceOf(alice.address)).to.equal(units);
      await expect(router.connect(trustee).settleRedemption(id("r"))).to.be.revertedWithCustomError(router, "NotPending");
      await expect(router.connect(alice).cancelRedemption(id("r"))).to.be.revertedWithCustomError(router, "NotPending");
      await expect(router.connect(trustee).cancelRedemption(id("r"))).to.be.revertedWithCustomError(router, "NotPending");
      await expect(router.connect(alice).requestRedeem(1n, id("r"))).to.be.revertedWithCustomError(router, "OrderReused");
    }
  });
});

describe("Invariants: NAV jump boundary", () => {
  for (const dir of [1n, -1n]) {
    const label = dir > 0n ? "up" : "down";
    it(`a NAV move ${label} of exactly maxDeltaBps is accepted; one wei more is rejected`, async () => {
      const { manager, oracle } = await loadFixture(fixture);
      const nav = await oracle.nav();
      const bps = BigInt(await oracle.maxDeltaBps());
      const limit = (nav * bps) / 10_000n;
      expect((nav * bps) % 10_000n).to.equal(0n); // boundary is exact for this NAV, no rounding slack

      await expect(postNav(oracle, manager, nav + dir * (limit + 1n))).to.be.revertedWithCustomError(oracle, "JumpTooLarge");
      await expect(postNav(oracle, manager, nav + dir * limit)).to.emit(oracle, "NavUpdated");
      expect(await oracle.nav()).to.equal(nav + dir * limit);
    });
  }
});
