// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "../EscrowManager.sol";

contract EscrowManagerTest is EscrowManager {
    mapping(uint256 => Escrow) private _escrow;

    function addEscrow(uint256 round, ISchneeballschlacht schneeballschlacht)
        external
    {
        _addEscrow(round, new Escrow(round, schneeballschlacht));
    }

    function addEscrow2(uint256 round, Escrow escrow) external {
        _addEscrow(round, escrow);
    }
}
