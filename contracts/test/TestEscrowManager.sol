// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "../EscrowManager.sol";

contract TestEscrowManager is EscrowManager {
    constructor() EscrowManager() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ESCROW_ROLE, msg.sender);
    }

    function __dummy(uint256 a, uint256 b) external view returns (uint256) {
        return a + b;
    }  
}