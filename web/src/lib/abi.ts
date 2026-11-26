import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
]);

export const mockUsdtAbi = parseAbi([
  "function faucet()",
  "function lastFaucetAt(address) view returns (uint256)",
  "function FAUCET_COOLDOWN() view returns (uint256)",
  "error FaucetCooldown(uint256 availableAt)",
]);

export const registryAbi = parseAbi([
  "function isEligible(address) view returns (bool)",
  "function selfCertify()",
  "function selfCertifyEnabled() view returns (bool)",
  "error SelfCertifyDisabled()",
]);

export const oracleAbi = parseAbi([
  "function nav() view returns (uint256)",
  "function asOf() view returns (uint64)",
  "function maxAge() view returns (uint64)",
  "error StaleNav(uint64 asOf, uint64 maxAge)",
  "error NoNav()",
]);

export const routerAbi = parseAbi([
  "function quote(uint256 amount) view returns (uint256 shares, uint256 fee, uint256 navNow)",
  "function feeBps() view returns (uint16)",
  "function subscribe(uint256 amount, uint256 minShares, bytes32 orderId) returns (uint256)",
  "function requestRedeem(uint256 shares, bytes32 orderId)",
  "function cancelRedemption(bytes32 orderId)",
  "function redemptions(bytes32) view returns (address investor, uint256 shares, uint64 requestedAt, uint8 status)",
  "event Subscribed(bytes32 indexed orderId, address indexed investor, uint256 amount, uint256 fee, uint256 shares, uint256 nav, address trustee)",
  "event RedemptionRequested(bytes32 indexed orderId, address indexed investor, uint256 shares)",
  "event RedemptionSettled(bytes32 indexed orderId, address indexed investor, uint256 shares, uint256 payout, uint256 nav)",
  "event RedemptionCancelled(bytes32 indexed orderId, address indexed investor, uint256 shares)",
  "error NotEligible(address investor)",
  "error OrderReused(bytes32 orderId)",
  "error ZeroAmount()",
  "error Slippage(uint256 shares, uint256 minShares)",
  "error StaleNav(uint64 asOf, uint64 maxAge)",
  "error NotPending(bytes32 orderId)",
]);

export const vaultAbi = parseAbi([
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function referenceApyBps() view returns (uint256)",
  "function referenceSource() view returns (string)",
  "function referenceUpdatedAt() view returns (uint64)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
]);
