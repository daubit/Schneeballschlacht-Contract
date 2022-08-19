/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish, constants, Contract } from "ethers";
import { ethers } from "hardhat";

type PromiseOrValue<T> = T | Promise<T>;

type SnowballStruct = {
  level: PromiseOrValue<BigNumberish>;
  partners: PromiseOrValue<BigNumberish>[];
  parentSnowballId: PromiseOrValue<BigNumberish>;
};

describe("Schneeballschlacht - Escrow", async () => {
  let schneeball: Contract;
  let escrow: Contract;
  // eslint-disable-next-line no-unused-vars
  let users: SignerWithAddress[];

  describe("Escrow", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory(
        "SchneeballSchlachtTest"
      );
      schneeball = await Schneeball.deploy();
      await schneeball.deployed();

      const Escrow = await ethers.getContractFactory("Escrow");
      escrow = await Escrow.deploy(0, schneeball.address);
      await escrow.deployed();

      const depositTx = await escrow.deposit({ value: 300 });
      await depositTx.wait();
    });
    it("can start successfully", async () => {
      const userAddress = users[0].address;
      const balls: SnowballStruct[] = [
        { level: 20, partners: [1, 2, 3], parentSnowballId: 4 },
        { level: 19, partners: [5, 6, 7], parentSnowballId: 3 },
        { level: 18, partners: [5], parentSnowballId: 2 },
        { level: 17, partners: [], parentSnowballId: 1 },
      ];
      const setSnowballsOfAddress1Tx = await schneeball.setSnowballsOfAddress(
        0,
        userAddress,
        balls
      );
      await setSnowballsOfAddress1Tx.wait();

      const setSnowballsOfAddress2Tx = await schneeball.setSnowballsOfAddress(
        0,
        users[1].address,
        balls
      );
      await setSnowballsOfAddress2Tx.wait();

      const setPayoutPerTossTx = await schneeball.setPayoutPerToss(0, 3);
      await setPayoutPerTossTx.wait();

      const setWinnerTx = await schneeball.setWinner(0, users[1].address);
      await setWinnerTx.wait();

      const setWinnerBonusTx = await schneeball.setWinnerBonus(0, 10);
      await setWinnerBonusTx.wait();
    });

    it("can withdraw", async () => {
      const userAddress = users[0].address;

      const depositsOf = await escrow.depositsOf(userAddress);
      expect(Number(depositsOf)).to.be.equal(21);

      const depositTx = await escrow.deposit({ value: 21 });
      await depositTx.wait();

      const widthdraw = await escrow.withdraw(userAddress);
      await widthdraw.wait();

      await expect(escrow.depositsOf(userAddress)).to.revertedWith(
        "Already withdrawen"
      );

      await expect(escrow.withdraw(userAddress)).to.revertedWith(
        "Deposit already withdrawn"
      );

      await expect(escrow.withdraw(constants.AddressZero)).to.be.revertedWith(
        "null address"
      );
    });

    it("can withdraw - winner", async () => {
      const userAddress = users[1].address;

      const depositsOf = await escrow.depositsOf(users[1].address);
      expect(Number(depositsOf)).to.be.equal(51);

      const depositTx = await escrow.deposit({ value: 51 });
      await depositTx.wait();

      expect(await escrow.depositsOf(userAddress)).to.equal(51);

      const widthdraw = await escrow.withdraw(userAddress);
      await widthdraw.wait();

      await expect(escrow.depositsOf(userAddress)).to.revertedWith(
        "Already withdrawen"
      );

      await expect(escrow.withdraw(userAddress)).to.revertedWith(
        "Deposit already withdrawn"
      );
    });
  });
});
