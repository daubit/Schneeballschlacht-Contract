/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish, Contract } from "ethers";
import { ethers } from "hardhat";

type PromiseOrValue<T> = T | Promise<T>;

type SnowballStruct = {
  level: PromiseOrValue<BigNumberish>;
  partners: PromiseOrValue<BigNumberish>[];
  parentSnowballId: PromiseOrValue<BigNumberish>;
};

describe("Schneeballschlacht - EscrowManager", async () => {
  let schneeball: Contract;
  let users: SignerWithAddress[];

  describe("Pullpayment", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory(
        "SchneeballSchlachtTest"
      );
      schneeball = await Schneeball.deploy();
      await schneeball.deployed();
    });

    it("pull payment", async () => {
      const userAddress = users[0];
      const EscrowManager = await ethers.getContractFactory(
        "TestEscrowManager"
      );
      const escrowManager = await EscrowManager.deploy();
      await escrowManager.deployed();

      const Escrow = await ethers.getContractFactory("Escrow");

      const addEscrow1 = await escrowManager.createEscrow(
        1,
        schneeball.address
      );
      await addEscrow1.wait();
      const addEscrowRevert = escrowManager.createEscrow(1, schneeball.address);
      expect(addEscrowRevert).to.be.reverted;

      const escrowRound1Address = await escrowManager.getEscrow(1);
      const escrowRound1 = Escrow.attach(escrowRound1Address);
      const depositTx = await escrowRound1.deposit({ value: 30 });
      await depositTx.wait();

      const balls: SnowballStruct[] = [
        { level: 20, partners: [4, 5], parentSnowballId: 4 },
        { level: 19, partners: [6], parentSnowballId: 3 },
        { level: 18, partners: [7, 8, 9, 10, 11, 12, 23], parentSnowballId: 2 },
        { level: 17, partners: [], parentSnowballId: 1 },
      ];
      const setSnowballsOfAddressTx = await schneeball.setSnowballsOfAddress(
        1,
        userAddress.address,
        balls
      );
      await setSnowballsOfAddressTx.wait();
      const setPayoutPerTossTx = await schneeball.setPayoutPerToss(1, 3);
      await setPayoutPerTossTx.wait();

      const depositsOf = await escrowRound1.depositsOf(userAddress.address);
      expect(Number(depositsOf)).to.be.equal(30);
      const depositsOf2 = await escrowManager.depositsOf(
        1,
        userAddress.address
      );
      expect(Number(depositsOf2)).to.be.equal(30);

      const widthdraw = await escrowManager.withdraw(1, userAddress.address);
      await widthdraw.wait();

      const depositsOf1 = escrowManager.depositsOf(1, userAddress.address);
      expect(depositsOf1).to.be.reverted;

      const widthdrawRevert = escrowManager.withdraw(1, userAddress.address);
      expect(widthdrawRevert).to.be.reverted;

      const widthdrawRevert2 = escrowManager.withdraw(1, users[1].address);
      expect(widthdrawRevert2).to.be.reverted;
    });
  });
});
