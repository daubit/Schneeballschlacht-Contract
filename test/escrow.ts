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

describe("SchneeballSchlacht - Enumerable", async () => {
  let schneeball: Contract;
  let escrow: Contract;
  // eslint-disable-next-line no-unused-vars
  let users: SignerWithAddress[];

  describe("Enumerable - Transfer flow", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy SchneeballSchlacht
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
      const userAddress = users[0];
      const balls: SnowballStruct[] = [
        { level: 20, partners: [], parentSnowballId: 4 },
        { level: 19, partners: [], parentSnowballId: 3 },
        { level: 18, partners: [], parentSnowballId: 2 },
        { level: 17, partners: [], parentSnowballId: 1 },
      ];
      const setSnowballsOfAddressTx = await schneeball.setSnowballsOfAddress(
        0,
        userAddress.address,
        balls
      );
      await setSnowballsOfAddressTx.wait();
      const setPayoutPerLevelTx = await schneeball.setPayoutPerLevel(0, 3);
      await setPayoutPerLevelTx.wait();

      const depositsOf = await escrow.depositsOf(userAddress.address);
      expect(Number(depositsOf)).to.be.equal(222);
    });

    it("can withdraw", async () => {
      const userAddress = users[0];
      const depositTx = await escrow.deposit({ value: 300 });
      await depositTx.wait();

      const widthdraw = await escrow.withdraw(userAddress.address);
      await widthdraw.wait();

      const depositsOf = await escrow.depositsOf(userAddress.address);
      expect(Number(depositsOf)).to.be.equal(0);

      const widthdrawRevert = escrow.withdraw(userAddress.address);
      expect(widthdrawRevert).to.be.reverted;

      const widthdrawRevert2 = escrow.withdraw(users[1].address);
      expect(widthdrawRevert2).to.be.reverted;
    });
  });
});
