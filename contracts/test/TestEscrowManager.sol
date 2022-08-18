// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "../EscrowManager.sol";

contract TestEscrowManager is EscrowManager {
    constructor() EscrowManager() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ESCROW_ROLE, msg.sender);
    }
}