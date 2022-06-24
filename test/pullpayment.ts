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

describe("Schneeballschlacht - Pullpayment", async () => {
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
      const PullPaymentRound = await ethers.getContractFactory(
        "PullPaymentRoundTest"
      );
      const pullPaymentRound = await PullPaymentRound.deploy(
        ethers.constants.AddressZero
      );
      await pullPaymentRound.deployed();

      const Escrow = await ethers.getContractFactory("Escrow");

      const addEscrow1 = await pullPaymentRound.addEscrow(
        1,
        schneeball.address
      );
      await addEscrow1.wait();
      const addEscrowRevert = pullPaymentRound.addEscrow(1, schneeball.address);
      expect(addEscrowRevert).to.be.reverted;

      const escrowRound1Address = await pullPaymentRound.getEscrow(1);
      const escrowRound1 = Escrow.attach(escrowRound1Address);
      const depositTx = await escrowRound1.deposit({ value: 300 });
      await depositTx.wait();

      const balls: SnowballStruct[] = [
        { level: 20, partners: [], parentSnowballId: 4 },
        { level: 19, partners: [], parentSnowballId: 3 },
        { level: 18, partners: [], parentSnowballId: 2 },
        { level: 17, partners: [], parentSnowballId: 1 },
      ];
      const setSnowballsOfAddressTx = await schneeball.setSnowballsOfAddress(
        1,
        userAddress.address,
        balls
      );
      await setSnowballsOfAddressTx.wait();
      const setPayoutPerLevelTx = await schneeball.setPayoutPerLevel(1, 3);
      await setPayoutPerLevelTx.wait();

      const depositsOf = await escrowRound1.depositsOf(userAddress.address);
      expect(Number(depositsOf)).to.be.equal(222);
      const depositsOf2 = await pullPaymentRound.depositsOf(
        1,
        userAddress.address
      );
      expect(Number(depositsOf2)).to.be.equal(222);

      const widthdraw = await pullPaymentRound.withdraw(1, userAddress.address);
      await widthdraw.wait();

      const depositsOf1 = await pullPaymentRound.depositsOf(
        1,
        userAddress.address
      );
      expect(Number(depositsOf1)).to.be.equal(0);

      const widthdrawRevert = pullPaymentRound.withdraw(1, userAddress.address);
      expect(widthdrawRevert).to.be.reverted;

      const widthdrawRevert2 = pullPaymentRound.withdraw(1, users[1].address);
      expect(widthdrawRevert2).to.be.reverted;
    });
  });
});
