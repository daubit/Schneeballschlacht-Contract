// SPDX-License-Identifier: CC-BY-NC-4.0

pragma solidity ^0.8.0;

import "./Escrow.sol";

contract PullPaymentRound {
    mapping (uint256 => Escrow) private _escrow;

    function addEscrow(uint256 round, Escrow escrow) internal {
        require(_escrow[round] == Escrow(address(0x0)), "Escrow alread exists");

        _escrow[round] = escrow;
    }

    function getEscrow(uint256 round) public view returns(Escrow) {
        return _escrow[round];
    }

    function withdraw(uint256 round, address payable payee) external {
        _escrow[round].withdraw(payee);
    }
}