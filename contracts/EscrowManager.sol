// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "./Escrow.sol";

contract EscrowManager {
    mapping(uint256 => IEscrow) private _escrow;

    function withdraw(uint256 round, address payable payee) external {
        _escrow[round].withdraw(payee);
    }

    function depositsOf(uint256 round, address payee)
        external
        view
        returns (uint256)
    {
        return _escrow[round].depositsOf(payee);
    }

    function getEscrow(uint256 round) public view returns (IEscrow) {
        return _escrow[round];
    }

    function _addEscrow(uint256 round, ISchneeballschlacht schneeballschlacht) internal returns (IEscrow) {
        require(
            _escrow[round] == IEscrow(address(0x0)),
            "Escrow already exists"
        );

        _escrow[round] = new Escrow(round, schneeballschlacht);

        return _escrow[round];
    }
}
