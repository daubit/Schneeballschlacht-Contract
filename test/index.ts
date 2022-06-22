/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";

const MINT_FEE = parseEther("0.1");
const TRANSFER_FEE = (level: number) => parseEther((0.001 * level).toFixed(10));

describe("SchneeballSchlacht", async () => {
  let schneeball: Contract;
  // eslint-disable-next-line no-unused-vars
  let users: SignerWithAddress[];
  describe("Contract Creation", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy SchneeballSchlacht
      const Schneeball = await ethers.getContractFactory("SchneeballSchlacht");
      schneeball = await Schneeball.deploy();
      await schneeball.deployed();
    });
    it("Name is correct", async () => {
      expect(await schneeball.name()).to.be.eq("SchneeballSchlacht");
    });
    it("Symbol is correct", async () => {
      expect(await schneeball.symbol()).to.be.eq("Schneeball");
    });
    it("mint is locked", async () => {
      const userAddress = users[0].address;
      expect(schneeball.mint(userAddress, { value: MINT_FEE })).to.be.reverted;
    });
    it("toss is locked", async () => {
      const userAddress = users[0].address;
      const partnerAddress = users[1].address;
      expect(
        schneeball
          .attach(userAddress)
          .toss(partnerAddress, 1, { value: TRANSFER_FEE(1) })
      ).to.be.reverted;
    });
    it("endRound is locked", async () => {
      expect(schneeball.endRound()).to.be.reverted;
    });
  });

  describe("Simple mint and toss flow", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy SchneeballSchlacht
      const Schneeball = await ethers.getContractFactory("SchneeballSchlacht");
      schneeball = await Schneeball.deploy();
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
      expect(Number(balance)).to.equal(1);
      const level = await schneeball.functions["getLevel(uint256)"](1);
      expect(Number(level)).to.equal(1);
      const totalSupply = await schneeball.functions["totalSupply()"]();
      expect(Number(totalSupply)).to.equal(1);
    });
    it("can toss successfully", async () => {
      const userAddress = users[0].address;
      const partnerAddress = users[1].address;
      const partner2Address = users[2].address;
      let tossTx;
      let balance;

      tossTx = await schneeball.connect(users[0]).toss(partnerAddress, 1, {
        value: TRANSFER_FEE(1),
      });
      await tossTx.wait();
      balance = await schneeball.functions["balanceOf(address)"](
        partnerAddress
      );
      expect(Number(balance)).to.equal(1);
      balance = await schneeball.functions["balanceOf(address)"](userAddress);
      expect(Number(balance)).to.equal(1);

      tossTx = await schneeball.connect(users[0]).toss(partner2Address, 1, {
        value: TRANSFER_FEE(1),
      });
      await tossTx.wait();
      balance = await schneeball.functions["balanceOf(address)"](
        partner2Address
      );
      expect(Number(balance)).to.equal(1);
    });
    it("has an successful upgrade", async () => {
      const level = (await schneeball.functions["getLevel(uint256)"](4))[0];
      expect(level).to.be.equal(2);
    });
  });
});
