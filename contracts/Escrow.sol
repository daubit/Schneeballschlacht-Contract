// SPDX-License-Identifier: MIT
// Adapted from OpenZeppelin Contracts v4.4.1 (utils/escrow/Escrow.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./ISchneeballSchlacht.sol";

contract Escrow is Ownable {
    using Address for address payable;

    event Withdrawn(address indexed payee, uint256 weiAmount);

    uint256 private _round;
    ISchneeballSchlacht private _schneeballschlacht;

    // bool is false by default
    mapping(address => bool) private _hasWithdrawn;

    constructor(uint256 round, ISchneeballSchlacht schneeballschlacht) {
        _round = round;
        _schneeballschlacht = schneeballschlacht;
    }

    function depositsOf(address payee) public view returns (uint256) {
        require(!_hasWithdrawn[payee], "Already withdrawed");
        uint256 payoutPerLevel = _schneeballschlacht.getPayoutPerLevel(_round);
        Snowball[] memory tokens = _schneeballschlacht.getSnowballsOfAddress(
            _round,
            payee
        );
        uint256 payout;
        for (uint256 index; index < tokens.length; index++) {
            payout += tokens[index].level * payoutPerLevel;
        }
        return payout;
    }

    function deposit() external payable virtual {
        // noop to deposit funds
    }

    // TODO: do we need onlyowner here?
    function withdraw(address payable payee) external onlyOwner {
        require(_hasWithdrawn[payee] != true, "Deposit already withdrawn");

        uint256 payment = depositsOf(payee);
        require(payment > 0, "No Deposit");
        payee.sendValue(payment);
        _hasWithdrawn[payee] = true;

        emit Withdrawn(payee, payment);
    }
}
