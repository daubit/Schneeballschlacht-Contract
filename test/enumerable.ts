/* eslint-disable node/no-missing-import */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { MINT_FEE } from "../scripts/utils";
import { REGISTRY_ADDRESS_ADDRESS } from "../scripts/util/const.json";

describe("Schneeballschlacht - Enumerable", async () => {
  let schneeball: Contract;
  // eslint-disable-next-line no-unused-vars
  let users: SignerWithAddress[];

  describe("Enumerable - Simple mint flow", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(
        ethers.constants.AddressZero,
        5,
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
        "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
        REGISTRY_ADDRESS_ADDRESS,
        60,
        15
      );
      await schneeball.deployed();
    });
    it("can start successfully", async () => {
      const startTx = await schneeball.startRound();
      await startTx.wait();
      const endHeight = await schneeball.functions["getEndHeight()"]();
      const currentHeight = await ethers.provider.getBlockNumber();
      expect(Number(endHeight)).to.be.be.greaterThan(Number(currentHeight));
    });
    it("CANNOT end round", async () => {
      expect(schneeball.endRound()).to.be.reverted;
    });
    it("mint successfully", async () => {
      const userAddress = users[0].address;
      const mintTx = await schneeball.mint(userAddress, { value: MINT_FEE });
      await mintTx.wait();
      const balance = await schneeball.functions["balanceOf(address)"](
        userAddress
      );
      expect(Number(balance)).to.equal(2);
      const level = await schneeball.functions["getLevel(uint256)"](1);
      expect(Number(level)).to.equal(1);
      const totalSupply = await schneeball.functions["totalSupply()"]();
      expect(Number(totalSupply)).to.equal(2);
      // the array is inside another array for whatever reason
      const getTokensOfAddress: Array<BigNumber> = (
        (await schneeball.functions["getTokensOfAddress(address)"](
          userAddress
        )) as Array<Array<BigNumber>>
      )[0];
      expect(getTokensOfAddress.length).to.equal(2);
      expect(getTokensOfAddress[0].toNumber()).to.equal(1);
      expect(getTokensOfAddress[1].toNumber()).to.equal(2);

      const mintTx2 = await schneeball.mint(userAddress, { value: MINT_FEE });
      await mintTx2.wait();
      const balance2 = await schneeball.functions["balanceOf(address)"](
        userAddress
      );
      expect(Number(balance2)).to.equal(3);
      const level2 = await schneeball.functions["getLevel(uint256)"](2);
      expect(Number(level2)).to.equal(1);
      const totalSupply2 = await schneeball.functions["totalSupply()"]();
      expect(Number(totalSupply2)).to.equal(3);
      const getTokensOfAddress2: Array<BigNumber> = (
        (await schneeball.functions["getTokensOfAddress(address)"](
          userAddress
        )) as Array<Array<BigNumber>>
      )[0];
      expect(getTokensOfAddress2.length).to.equal(3);
      expect(getTokensOfAddress2[0]).to.equal(1);
      expect(getTokensOfAddress2[1]).to.equal(2);
      expect(getTokensOfAddress2[2]).to.equal(3);
    });
  });

  describe("Enumerable - Transfer flow", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(
        ethers.constants.AddressZero,
        5,
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
        "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
        REGISTRY_ADDRESS_ADDRESS,
        60,
        15
      );
      await schneeball.deployed();
    });
    it("can start successfully", async () => {
      const startTx = await schneeball.startRound();
      await startTx.wait();
      const endHeight = await schneeball.functions["getEndHeight()"]();
      const currentHeight = await ethers.provider.getBlockNumber();
      expect(Number(endHeight)).to.be.be.greaterThan(Number(currentHeight));
    });
    it("transfer successfully", async () => {
      const userAddress = users[0].address;
      const user2Address = users[1].address;
      const mintTx = await schneeball.mint(userAddress, { value: MINT_FEE });
      await mintTx.wait();
      const balance = await schneeball.functions["balanceOf(address)"](
        userAddress
      );
      expect(Number(balance)).to.equal(2);
      const level = await schneeball.functions["getLevel(uint256)"](1);
      expect(Number(level)).to.equal(1);
      const totalSupply = await schneeball.functions["totalSupply()"]();
      expect(Number(totalSupply)).to.equal(2);
      // the array is inside another array for whatever reason
      const getTokensOfAddress: Array<BigNumber> = (
        (await schneeball.functions["getTokensOfAddress(address)"](
          userAddress
        )) as Array<Array<BigNumber>>
      )[0];
      expect(getTokensOfAddress.length).to.equal(2);
      expect(getTokensOfAddress[0].toNumber()).to.equal(1);
      expect(getTokensOfAddress[1].toNumber()).to.equal(2);

      const transferTx = await schneeball.functions[
        "transferFrom(address,address,uint256)"
      ](userAddress, user2Address, 1);
      await transferTx.wait();

      const balance1 = await schneeball.functions["balanceOf(address)"](
        userAddress
      );
      expect(Number(balance1)).to.equal(1);
      const balance2 = await schneeball.functions["balanceOf(address)"](
        user2Address
      );
      expect(Number(balance2)).to.equal(1);
      const totalSupply2 = await schneeball.functions["totalSupply()"]();
      expect(Number(totalSupply2)).to.equal(2);

      const getTokensOfAddress2: Array<BigNumber> = (
        (await schneeball.functions["getTokensOfAddress(address)"](
          userAddress
        )) as Array<Array<BigNumber>>
      )[0];
      expect(getTokensOfAddress2.length).to.equal(1);
      expect(getTokensOfAddress2[0]).to.equal(2);

      const getTokensOfAddress3: Array<BigNumber> = (
        (await schneeball.functions["getTokensOfAddress(address)"](
          user2Address
        )) as Array<Array<BigNumber>>
      )[0];
      expect(getTokensOfAddress3.length).to.equal(1);
      expect(getTokensOfAddress3[0]).to.equal(1);
    });
  });

  describe("Enumerable - Complex Transfer flow", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(
        ethers.constants.AddressZero,
        5,
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
        "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
        REGISTRY_ADDRESS_ADDRESS,
        60,
        15
      );
      await schneeball.deployed();
    });
    it("can start successfully", async () => {
      const startTx = await schneeball.startRound();
      await startTx.wait();
      const endHeight = await schneeball.functions["getEndHeight()"]();
      const currentHeight = await ethers.provider.getBlockNumber();
      expect(Number(endHeight)).to.be.be.greaterThan(Number(currentHeight));
    });
    it("transfer successfully", async () => {
      const userAddress = users[0].address;
      const user2Address = users[1].address;
      const mintTx1 = await schneeball.mint(userAddress, { value: MINT_FEE });
      await mintTx1.wait();
      const mintTx2 = await schneeball.mint(userAddress, { value: MINT_FEE });
      await mintTx2.wait();
      const mintTx3 = await schneeball.mint(userAddress, { value: MINT_FEE });
      await mintTx3.wait();
      const balance = await schneeball.functions["balanceOf(address)"](
        userAddress
      );
      expect(Number(balance)).to.equal(4);
      const totalSupply = await schneeball.functions["totalSupply()"]();
      expect(Number(totalSupply)).to.equal(4);
      // the array is inside another array for whatever reason
      const getTokensOfAddress: Array<BigNumber> = (
        (await schneeball.functions["getTokensOfAddress(address)"](
          userAddress
        )) as Array<Array<BigNumber>>
      )[0];
      expect(getTokensOfAddress.length).to.equal(4);
      expect(getTokensOfAddress[0].toNumber()).to.equal(1);
      expect(getTokensOfAddress[1].toNumber()).to.equal(2);
      expect(getTokensOfAddress[2].toNumber()).to.equal(3);
      expect(getTokensOfAddress[3].toNumber()).to.equal(4);

      const transferTx = await schneeball.functions[
        "transferFrom(address,address,uint256)"
      ](userAddress, user2Address, 2);
      await transferTx.wait();

      const balance1 = await schneeball.functions["balanceOf(address)"](
        userAddress
      );
      expect(Number(balance1)).to.equal(3);
      const balance2 = await schneeball.functions["balanceOf(address)"](
        user2Address
      );
      expect(Number(balance2)).to.equal(1);
      const totalSupply2 = await schneeball.functions["totalSupply()"]();
      expect(Number(totalSupply2)).to.equal(4);

      const getTokensOfAddress2: Array<BigNumber> = (
        (await schneeball.functions["getTokensOfAddress(address)"](
          userAddress
        )) as Array<Array<BigNumber>>
      )[0];
      expect(getTokensOfAddress2.length).to.equal(3);
      expect(getTokensOfAddress2[0].toNumber()).to.equal(1);
      expect(getTokensOfAddress2[1].toNumber()).to.equal(4);
      expect(getTokensOfAddress2[2].toNumber()).to.equal(3);

      const getTokensOfAddress3: Array<BigNumber> = (
        (await schneeball.functions["getTokensOfAddress(address)"](
          user2Address
        )) as Array<Array<BigNumber>>
      )[0];
      expect(getTokensOfAddress3.length).to.equal(1);
      expect(getTokensOfAddress3[0]).to.equal(2);
    });
  });
});
