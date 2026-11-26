// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {FundShare} from "./FundShare.sol";
import {NavOracle} from "./NavOracle.sol";
import {InvestorRegistry} from "./InvestorRegistry.sol";

/// @title SubscriptionRouter — routes an investor's order; never holds the investor's money.
/// @notice Subscriptions move stablecoin straight from the investor to the fund trustee and mint
///         units to the investor at the signed NAV. Redemptions escrow units, then the settler pays
///         from the trustee account at NAV. Every step emits an event that the app shows as a receipt.
contract SubscriptionRouter is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    uint16 public constant MAX_FEE_BPS = 100; // 1% hard cap

    enum Status {
        None,
        Pending,
        Settled,
        Cancelled
    }

    struct Redemption {
        address investor;
        uint256 shares;
        uint64 requestedAt;
        Status status;
    }

    IERC20 public immutable stable;
    FundShare public immutable share;
    NavOracle public immutable oracle;
    InvestorRegistry public immutable registry;
    address public trustee;
    address public feeRecipient;
    uint16 public feeBps;

    mapping(bytes32 => bool) public orderUsed;
    mapping(bytes32 => Redemption) public redemptions;

    event Subscribed(
        bytes32 indexed orderId,
        address indexed investor,
        uint256 amount,
        uint256 fee,
        uint256 shares,
        uint256 nav,
        address trustee
    );
    event RedemptionRequested(bytes32 indexed orderId, address indexed investor, uint256 shares);
    event RedemptionSettled(bytes32 indexed orderId, address indexed investor, uint256 shares, uint256 payout, uint256 nav);
    event RedemptionCancelled(bytes32 indexed orderId, address indexed investor, uint256 shares);
    event FeeSet(uint16 feeBps, address feeRecipient);
    event TrusteeSet(address trustee);

    error NotEligible(address investor);
    error OrderReused(bytes32 orderId);
    error ZeroAmount();
    error Slippage(uint256 shares, uint256 minShares);
    error FeeTooHigh(uint16 feeBps);
    error NotPending(bytes32 orderId);
    error NotInvestor(bytes32 orderId);
    error ZeroAddress();

    constructor(
        IERC20 stable_,
        FundShare share_,
        NavOracle oracle_,
        InvestorRegistry registry_,
        address trustee_,
        address feeRecipient_,
        uint16 feeBps_,
        address admin
    ) {
        if (trustee_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        stable = stable_;
        share = share_;
        oracle = oracle_;
        registry = registry_;
        trustee = trustee_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SETTLER_ROLE, trustee_);
    }

    /// @notice Preview: shares and fee for `amount` at the current NAV. Reverts if NAV is stale.
    function quote(uint256 amount) public view returns (uint256 shares, uint256 fee, uint256 navNow) {
        navNow = oracle.latestNav();
        fee = (amount * feeBps) / 10_000;
        shares = ((amount - fee) * 1e18) / navNow;
    }

    function subscribe(uint256 amount, uint256 minShares, bytes32 orderId) external nonReentrant returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();
        if (!registry.isEligible(msg.sender)) revert NotEligible(msg.sender);
        if (orderUsed[orderId]) revert OrderReused(orderId);
        orderUsed[orderId] = true;

        uint256 fee;
        uint256 navNow;
        (shares, fee, navNow) = quote(amount);
        if (shares == 0 || shares < minShares) revert Slippage(shares, minShares);

        stable.safeTransferFrom(msg.sender, trustee, amount - fee);
        if (fee > 0) stable.safeTransferFrom(msg.sender, feeRecipient, fee);
        share.mint(msg.sender, shares);

        emit Subscribed(orderId, msg.sender, amount, fee, shares, navNow, trustee);
    }

    function requestRedeem(uint256 shares, bytes32 orderId) external nonReentrant {
        if (shares == 0) revert ZeroAmount();
        if (orderUsed[orderId]) revert OrderReused(orderId);
        orderUsed[orderId] = true;
        share.escrow(msg.sender, shares);
        redemptions[orderId] = Redemption(msg.sender, shares, uint64(block.timestamp), Status.Pending);
        emit RedemptionRequested(orderId, msg.sender, shares);
    }

    /// @notice Settler pays the investor from the trustee account at the current NAV.
    ///         The trustee must have approved this router for the payout amount.
    function settleRedemption(bytes32 orderId) external nonReentrant onlyRole(SETTLER_ROLE) returns (uint256 payout) {
        Redemption storage r = redemptions[orderId];
        if (r.status != Status.Pending) revert NotPending(orderId);
        r.status = Status.Settled;
        uint256 navNow = oracle.latestNav();
        payout = (r.shares * navNow) / 1e18;
        share.burn(address(this), r.shares);
        stable.safeTransferFrom(trustee, r.investor, payout);
        emit RedemptionSettled(orderId, r.investor, r.shares, payout, navNow);
    }

    function cancelRedemption(bytes32 orderId) external nonReentrant {
        Redemption storage r = redemptions[orderId];
        if (r.status != Status.Pending) revert NotPending(orderId);
        if (r.investor != msg.sender && !hasRole(SETTLER_ROLE, msg.sender)) revert NotInvestor(orderId);
        r.status = Status.Cancelled;
        IERC20(address(share)).safeTransfer(r.investor, r.shares);
        emit RedemptionCancelled(orderId, r.investor, r.shares);
    }

    function setFee(uint16 feeBps_, address feeRecipient_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        feeBps = feeBps_;
        feeRecipient = feeRecipient_;
        emit FeeSet(feeBps_, feeRecipient_);
    }

    function setTrustee(address trustee_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (trustee_ == address(0)) revert ZeroAddress();
        _revokeRole(SETTLER_ROLE, trustee);
        trustee = trustee_;
        _grantRole(SETTLER_ROLE, trustee_);
        emit TrusteeSet(trustee_);
    }
}
