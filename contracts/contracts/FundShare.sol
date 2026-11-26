// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {InvestorRegistry} from "./InvestorRegistry.sol";

/// @title FundShare — units of one fund, recorded in the investor's own wallet.
/// @notice Only the subscription router mints, burns or escrows. Holders may only transfer
///         to other eligible investors, so units never leave the eligible set.
contract FundShare is ERC20, AccessControl {
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

    InvestorRegistry public immutable registry;

    error NotEligible(address account);

    constructor(string memory name_, string memory symbol_, InvestorRegistry registry_, address admin)
        ERC20(name_, symbol_)
    {
        registry = registry_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(ROUTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(ROUTER_ROLE) {
        _burn(from, amount);
    }

    /// @notice Move `amount` from `from` into the router's escrow. The router only calls this
    ///         with `from == msg.sender` of its own entry point, so the investor consents.
    function escrow(address from, uint256 amount) external onlyRole(ROUTER_ROLE) {
        _transfer(from, msg.sender, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        bool fromRouter = from != address(0) && hasRole(ROUTER_ROLE, from);
        bool toRouter = to != address(0) && hasRole(ROUTER_ROLE, to);
        if (to != address(0) && !toRouter && !registry.isEligible(to)) revert NotEligible(to);
        if (from != address(0) && !fromRouter && !toRouter && to != address(0) && !registry.isEligible(from)) {
            revert NotEligible(from);
        }
        super._update(from, to, value);
    }
}
