// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title NavOracle — net asset value per share, signed off-chain by the fund administrator.
/// @notice Anyone may relay a signed update; only a MANAGER_ROLE signature is accepted.
///         Reads revert when the NAV is stale, so no subscription prices off an old value.
contract NavOracle is AccessControl, EIP712 {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 private constant NAV_TYPEHASH = keccak256("NavUpdate(uint256 nav,uint64 asOf,uint64 nonce)");

    struct NavUpdate {
        uint256 nav; // stablecoin units (18 decimals) per 1e18 shares
        uint64 asOf; // unix time the administrator struck the NAV
        uint64 nonce;
    }

    uint256 public nav;
    uint64 public asOf;
    uint64 public nextNonce;
    uint64 public maxAge; // seconds a NAV stays usable
    uint16 public maxDeltaBps; // largest allowed move between consecutive NAVs

    event NavUpdated(uint256 nav, uint64 asOf, uint64 nonce, address indexed signer);
    event ParamsSet(uint64 maxAge, uint16 maxDeltaBps);

    error BadSigner(address signer);
    error BadNonce(uint64 expected, uint64 got);
    error NotNewer(uint64 current, uint64 got);
    error FromFuture(uint64 asOf);
    error JumpTooLarge(uint256 previous, uint256 proposed);
    error StaleNav(uint64 asOf, uint64 maxAge);
    error NoNav();
    error ZeroNav();

    constructor(address admin, address manager, uint64 maxAge_, uint16 maxDeltaBps_)
        EIP712("SplashzNavOracle", "1")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, manager);
        maxAge = maxAge_;
        maxDeltaBps = maxDeltaBps_;
    }

    function digest(NavUpdate calldata u) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(NAV_TYPEHASH, u.nav, u.asOf, u.nonce)));
    }

    function submit(NavUpdate calldata u, bytes calldata signature) external {
        address signer = ECDSA.recover(digest(u), signature);
        if (!hasRole(MANAGER_ROLE, signer)) revert BadSigner(signer);
        if (u.nonce != nextNonce) revert BadNonce(nextNonce, u.nonce);
        if (u.nav == 0) revert ZeroNav();
        if (u.asOf <= asOf) revert NotNewer(asOf, u.asOf);
        if (u.asOf > block.timestamp + 5 minutes) revert FromFuture(u.asOf);
        if (nav != 0) {
            uint256 diff = u.nav > nav ? u.nav - nav : nav - u.nav;
            if (diff * 10_000 > uint256(nav) * maxDeltaBps) revert JumpTooLarge(nav, u.nav);
        }
        nav = u.nav;
        asOf = u.asOf;
        nextNonce = u.nonce + 1;
        emit NavUpdated(u.nav, u.asOf, u.nonce, signer);
    }

    /// @notice The NAV usable for pricing right now. Reverts if missing or stale.
    function latestNav() external view returns (uint256) {
        if (nav == 0) revert NoNav();
        if (block.timestamp > uint256(asOf) + maxAge) revert StaleNav(asOf, maxAge);
        return nav;
    }

    function setParams(uint64 maxAge_, uint16 maxDeltaBps_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxAge = maxAge_;
        maxDeltaBps = maxDeltaBps_;
        emit ParamsSet(maxAge_, maxDeltaBps_);
    }
}
