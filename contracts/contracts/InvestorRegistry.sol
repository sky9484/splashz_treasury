// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title InvestorRegistry — who may hold fund shares.
/// @notice On mainnet, COMPLIANCE_ROLE (the licensed manager or its KYC provider) sets eligibility.
///         On testnet the admin can enable self-certification so judges can try the flow.
contract InvestorRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    mapping(address => bool) private _eligible;
    bool public selfCertifyEnabled;

    event EligibilitySet(address indexed investor, bool eligible, address indexed by);
    event SelfCertifyToggled(bool enabled);

    error SelfCertifyDisabled();

    constructor(address admin, bool selfCertify_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, admin);
        selfCertifyEnabled = selfCertify_;
    }

    function isEligible(address investor) external view returns (bool) {
        return _eligible[investor];
    }

    function setEligible(address investor, bool eligible) external onlyRole(COMPLIANCE_ROLE) {
        _eligible[investor] = eligible;
        emit EligibilitySet(investor, eligible, msg.sender);
    }

    /// @notice Testnet only: the caller declares itself an eligible (sophisticated) investor.
    function selfCertify() external {
        if (!selfCertifyEnabled) revert SelfCertifyDisabled();
        _eligible[msg.sender] = true;
        emit EligibilitySet(msg.sender, true, msg.sender);
    }

    function setSelfCertify(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        selfCertifyEnabled = enabled;
        emit SelfCertifyToggled(enabled);
    }
}
