// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title StableVault — ERC-4626 stablecoin vault for the testnet demo.
/// @notice Shares stay in the depositor's wallet. On testnet a keeper pays in yield that mirrors a
///         live mainnet reference rate (for example Venus Core Pool USDT on BNB Chain) and records
///         that reference on-chain so the app can show where the number came from.
contract StableVault is ERC4626, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint256 public referenceApyBps;
    string public referenceSource;
    uint64 public referenceUpdatedAt;

    event YieldReported(uint256 amount, uint256 totalAssetsAfter);
    event ReferenceApySet(uint256 apyBps, string source, uint64 at);

    constructor(IERC20 asset_, address admin, address keeper)
        ERC20("Splashz USDT Vault", "szUSDT")
        ERC4626(asset_)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KEEPER_ROLE, keeper);
    }

    /// @dev Virtual shares offset blunts the first-depositor inflation attack.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    function reportYield(uint256 amount) external onlyRole(KEEPER_ROLE) {
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        emit YieldReported(amount, totalAssets());
    }

    function setReferenceApy(uint256 apyBps, string calldata source) external onlyRole(KEEPER_ROLE) {
        referenceApyBps = apyBps;
        referenceSource = source;
        referenceUpdatedAt = uint64(block.timestamp);
        emit ReferenceApySet(apyBps, source, uint64(block.timestamp));
    }
}
