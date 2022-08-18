// SPDX-License-Identifier: MIT
// Adapted from OpenZeppelin Contracts v4.4.1 (utils/escrow/Escrow.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "./ISchneeballschlacht.sol";
import "./IEscrow.sol";

contract Escrow is IEscrow {
    using Address for address payable;

    ISchneeballschlacht private _schneeballschlacht;

    uint256 private _round;

    mapping(address => bool) private _hasWithdrawn;

    constructor(uint256 round, ISchneeballschlacht schneeballschlacht) {
        _round = round;
        _schneeballschlacht = schneeballschlacht;
    }

    function depositsOf(address payee) public view returns (uint256) {
        require(!_hasWithdrawn[payee], "Already withdrawen");
        require(payee != address(0), "null address");
        uint256 payoutPerToss = _schneeballschlacht.getPayoutPerToss(_round);
        Snowball[] memory tokens = _schneeballschlacht.getSnowballsOfAddress(
            _round,
            payee
        );
        uint256 payout;
        for (uint256 index; index < tokens.length; index++) {
            payout += tokens[index].partners.length * payoutPerToss;
        }
        if (_schneeballschlacht.getWinner(_round) == payee) {
            payout +=
                _schneeballschlacht.getWinnerBonus(_round) *
                payoutPerToss;
        }
        return payout;
    }

    function deposit() external payable virtual {
        // noop to deposit funds
    }

    function withdraw(address payable payee) external {
        require(_hasWithdrawn[payee] != true, "Deposit already withdrawn");

        uint256 payment = depositsOf(payee);
        require(payment > 0, "No Deposit");
        payee.sendValue(payment);
        _hasWithdrawn[payee] = true;

        emit Withdraw(payee, payment);
    }
}
