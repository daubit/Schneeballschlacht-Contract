// SPDX-License-Identifier: MIT
// Adapted from OpenZeppelin Contracts v4.4.1 (utils/escrow/Escrow.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./ISchneeballSchlacht.sol";

contract Escrow is Ownable {
    using Address for address payable;

    //event Deposited(address indexed payee, uint256 weiAmount);
    event Withdrawn(address indexed payee, uint256 weiAmount);

    uint32 private _round;
    ISchneeballSchlacht private _schneeballschlacht;

    mapping(address => bool) private _withdrawn;

    constructor(uint32 round, ISchneeballSchlacht schneeballschlacht) {
        _round = round;
        _schneeballschlacht = schneeballschlacht;
    }

    function depositsOf(address payee) public view returns (uint256) {
        uint256 payoutPerLevel = _schneeballschlacht.getPayoutPerLevel(_round);
        // TODO: use Schneeball struct to save the getLevel calls
        uint256[] memory tokens = _schneeballschlacht.getTokensOfAddress(_round, payee);
        uint256 payout = 0;
        for (uint256 index = 0; index < tokens.length; index++) {
            payout += _schneeballschlacht.getLevel(_round, tokens[index]) * payoutPerLevel; 
        }
        return payout;
    }

    function withdraw(address payable payee) public virtual onlyOwner {
        require(_withdrawn[payee] == false, "Deposit already withdrawn");

        _withdrawn[payee] = true;
        uint256 payment = depositsOf(payee);
        require(payment > 0, "No Deposit");
        payee.sendValue(payment);

        emit Withdrawn(payee, payment);
    }

}