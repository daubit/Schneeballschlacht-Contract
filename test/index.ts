/* eslint-disable node/no-missing-import */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { MINT_FEE, TOSS_FEE } from "../scripts/utils";

describe("Schneeballschlacht", async () => {
  let schneeball: Contract;
  // eslint-disable-next-line no-unused-vars
  let users: SignerWithAddress[];
  describe("Contract Creation", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(ethers.constants.AddressZero);
      await schneeball.deployed();
    });
    it("Name is correct", async () => {
      expect(await schneeball.name()).to.be.eq("Schneeballschlacht");
    });
    it("Symbol is correct", async () => {
      expect(await schneeball.symbol()).to.be.eq("Schneeball");
    });
    it("mint is locked", async () => {
      const userAddress = users[0].address;
      expect(schneeball.mint(userAddress, { value: MINT_FEE })).to.be.reverted;
    });
    it("transferFrom is locked", async () => {
      const userAddress = users[0].address;
      const partnerAddress = users[1].address;
      expect(schneeball.transferFrom(userAddress, partnerAddress, 1)).to.be
        .reverted;
    });
    it("safeTransferFrom is locked", async () => {
      const userAddress = users[0].address;
      const partnerAddress = users[1].address;
      expect(
        schneeball["safeTransferFrom(address,address,uint256)"](
          userAddress,
          partnerAddress,
          1
        )
      ).to.be.reverted;
    });
    it("toss is locked", async () => {
      const userAddress = users[0].address;
      const partnerAddress = users[1].address;
      expect(
        schneeball
          .attach(userAddress)
          .toss(partnerAddress, 1, { value: TOSS_FEE(1) })
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

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(ethers.constants.AddressZero);
      await schneeball.deployed();
    });
    it("can start successfully", async () => {
      const startTx = await schneeball.startRound();
      await startTx.wait();
      const endHeight = await schneeball["getEndHeight()"]();
      const currentHeight = await ethers.provider.getBlockNumber();
      expect(Number(endHeight)).to.be.be.greaterThan(Number(currentHeight));
    });
    it("cannot repeat startRound", async () => {
      expect(schneeball.startRound()).to.be.reverted;
    });
    it("cannot end round", async () => {
      expect(schneeball.endRound()).to.be.reverted;
    });
    it("mint successfully", async () => {
      const userAddress = users[0].address;
      const mintTx = await schneeball.mint(userAddress, { value: MINT_FEE });
      await mintTx.wait();
      const balance = await schneeball["balanceOf(address)"](userAddress);
      expect(Number(balance)).to.equal(2);

      // Genesis snowball
      const genesislevel = await schneeball["getLevel(uint256)"](1);
      expect(Number(genesislevel)).to.equal(1);

      // Minted snowball
      const level = await schneeball["getLevel(uint256)"](2);
      expect(Number(level)).to.equal(1);
      const totalSupply = await schneeball["totalSupply()"]();
      expect(Number(totalSupply)).to.equal(2);
    });
    it("cannot mint with insufficient fee", async () => {
      const userAddress = users[0].address;
      const mintTx = schneeball.mint(userAddress);
      expect(mintTx).to.be.reverted;
    });
    it("cannot mint to zero address", async () => {
      const mintTx = schneeball.mint(ethers.constants.AddressZero);
      expect(mintTx).to.be.reverted;
    });
    it("can toss successfully", async () => {
      const userAddress = users[0].address;
      const partnerAddress = users[1].address;
      const partner2Address = users[2].address;
      let tossTx;
      let balance;

      tossTx = await schneeball.connect(users[0]).toss(partnerAddress, 1, {
        value: TOSS_FEE(1),
      });
      await tossTx.wait();
      balance = await schneeball["balanceOf(address)"](partnerAddress);
      expect(Number(balance)).to.equal(1);
      balance = await schneeball["balanceOf(address)"](userAddress);
      expect(Number(balance)).to.equal(2);

      tossTx = await schneeball.connect(users[0]).toss(partner2Address, 1, {
        value: TOSS_FEE(1),
      });
      await tossTx.wait();
      balance = await schneeball["balanceOf(address)"](partner2Address);
      expect(Number(balance)).to.greaterThanOrEqual(1);
    });
    it("cannot toss other users snowball", async () => {
      const tossTx = schneeball.connect(users[1]).toss(users[2].address, 1, {
        value: TOSS_FEE(1),
      });
      expect(tossTx).to.be.reverted;
    });
    it("cannot toss n + 1", async () => {
      const partnerAddress = users[1].address;
      expect(
        schneeball.connect(users[0]).toss(partnerAddress, 1, {
          value: TOSS_FEE(1),
        })
      ).to.be.reverted;
    });
    it("cannot toss with insufficient fee", async () => {
      const partnerAddress = users[1].address;
      expect(schneeball.connect(users[0]).toss(partnerAddress, 1)).to.be
        .reverted;
    });
    it("cannot toss to yourself", async () => {
      expect(schneeball.connect(users[0]).toss(users[0], 1)).to.be.revertedWith(
        "Error: Self Toss"
      );
    });
    it("cannot toss to address zero", async () => {
      expect(
        schneeball.connect(users[0]).toss(ethers.constants.AddressZero, 1)
      ).to.be.revertedWith("Error: zero address");
    });
    it("has an successful upgrade", async () => {
      const level = await schneeball["getLevel(uint256)"](5);
      expect(level).to.be.equal(2);
    });
    it("Contract has correct amount of payout", async () => {
      const balance = await ethers.provider.getBalance(schneeball.address);
      expect(String(balance)).to.be.eq(
        MINT_FEE.add(TOSS_FEE(1).add(TOSS_FEE(1))).toString()
      );
    });
    it("Token has correct tokenURI", async () => {
      const tokenURI = await schneeball["tokenURI(uint256)"](1);
      const tokenLevel = await schneeball["getLevel(uint256)"](1);
      expect(tokenURI).to.be.equal(`ipfs://${tokenLevel}`);
      const tokenURIRoundId = await schneeball["tokenURI(uint256,uint256)"](
        1,
        1
      );
      const tokenLevelRoundId = await schneeball["getLevel(uint256,uint256)"](
        1,
        1
      );
      expect(tokenURIRoundId).to.be.equal(`ipfs://${tokenLevelRoundId}`);
    });
    it("get correct partner token ids", async () => {
      const partnerIds = await schneeball["getPartnerTokenIds(uint256)"](1);
      expect(
        partnerIds.map((ids: BigNumber) => Number(ids))
      ).to.have.same.members([3, 4]);
      const partnerIdsAndRoundsId = await schneeball[
        "getPartnerTokenIds(uint256,uint256)"
      ](1, 1);
      expect(
        partnerIdsAndRoundsId.map((ids: BigNumber) => Number(ids))
      ).to.have.same.members([4, 3]);
    });
  });
  describe("ERC721", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(ethers.constants.AddressZero);
      await schneeball.deployed();
    });
    it("can start successfully", async () => {
      const startTx = await schneeball.startRound();
      await startTx.wait();
    });
    it("can transfer", async () => {
      const transferTx = await schneeball.transferFrom(
        users[0].address,
        users[1].address,
        1
      );
      let balance;
      await transferTx.wait();
      balance = await schneeball["balanceOf(address)"](users[0].address);
      expect(Number(balance)).to.equal(0);
      balance = await schneeball["balanceOf(address)"](users[1].address);
      expect(Number(balance)).to.equal(1);
    });
    it("can approve", async () => {
      const transferTx = await schneeball
        .connect(users[1])
        .approve(users[0].address, 1);
      await transferTx.wait();
      const approvedAddress = await schneeball["getApproved(uint256)"](1);
      expect(approvedAddress).to.be.equal(users[0].address);
    });
    it("Contract has correct amount of payout", async () => {
      const balance = await ethers.provider.getBalance(schneeball.address);
      expect(String(balance)).to.be.eq("0");
    });
    it("user can throw transfered token", async () => {
      const partnerAddress = users[1].address;
      expect(
        schneeball.connect(users[0]).toss(partnerAddress, 1, {
          value: TOSS_FEE(1),
        })
      ).to.not.be.reverted;
    });
  });
});
