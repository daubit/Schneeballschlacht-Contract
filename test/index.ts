/* eslint-disable prettier/prettier */
/* eslint-disable node/no-missing-import */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, constants, Contract } from "ethers";
import * as hardhat from "hardhat";
import { MINT_FEE, TOSS_FEE } from "../scripts/utils";
import { SnowballStruct } from "../typechain-types/contracts/Schneeballschlacht";
import { REGISTRY_ADDRESS_TESTNET } from "../scripts/util/const.json";

const ethers = hardhat.ethers;

type QueryStructOutput = [string, number, BigNumber] & {
  player: string;
  level: number;
  tokenId: BigNumber;
};

describe("Schneeballschlacht", async () => {
  before(async () => {
    // mine 43200 blocks
    await hardhat.network.provider.send("hardhat_mine", ["0xA8C0", "0x2"]);
  });
  let schneeball: Contract;
  // eslint-disable-next-line no-unused-vars
  let users: SignerWithAddress[];
  describe("Contract Creation", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        5,
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
        "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
        REGISTRY_ADDRESS_TESTNET,
        60,
        15
      );
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

  describe("Getters and Querys", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        5,
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
        "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
        REGISTRY_ADDRESS_TESTNET,
        60,
        15
      );
      await schneeball.deployed();
    });
    it("can start successfully", async () => {
      const startTx = await schneeball.startRound();
      await startTx.wait();
      let totalSupply = await schneeball["totalSupply()"]();
      expect(Number(totalSupply)).to.equal(1);
      totalSupply = await schneeball["totalSupply(uint256)"](1);
      expect(Number(totalSupply)).to.equal(1);
      const endHeight = await schneeball["getEndHeight()"]();
      const currentHeight = await ethers.provider.getBlockNumber();
      expect(Number(endHeight)).to.be.be.greaterThan(Number(currentHeight));
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
      let totalSupply = await schneeball["totalSupply()"]();
      expect(Number(totalSupply)).to.equal(2);
      totalSupply = await schneeball["totalSupply(uint256)"](1);
      expect(Number(totalSupply)).to.equal(2);
    });
    it("getSnowballsOfAddress", async () => {
      const userAddress = users[0].address;
      let snowballs: SnowballStruct[] = await schneeball[
        "getSnowballsOfAddress(address)"
      ](userAddress);
      expect(snowballs.length).to.equal(2);
      expect(snowballs[0].level).to.equal(1);
      expect(snowballs[1].level).to.equal(1);
      expect(snowballs[0].partners.length).to.equal(0);
      expect(snowballs[1].partners.length).to.equal(0);
      expect(snowballs[0].parentSnowballId).to.equal(0);
      expect(snowballs[1].parentSnowballId).to.equal(0);

      const tossTx = await schneeball
        .connect(users[0])
        .toss(users[1].address, 1, {
          value: TOSS_FEE(1),
        });
      await tossTx.wait();

      snowballs = await schneeball["getSnowballsOfAddress(address)"](
        userAddress
      );
      expect(snowballs.length).to.equal(2);
      expect(snowballs[0].level).to.equal(1);
      expect(snowballs[1].level).to.equal(1);
      expect(snowballs[0].partners.length).to.equal(1);
      expect(snowballs[0].partners[0]).to.equal(3);
      expect(snowballs[1].partners.length).to.equal(0);
      expect(snowballs[0].parentSnowballId).to.equal(0);
      expect(snowballs[1].parentSnowballId).to.equal(0);

      // TODO: check parentSnowballId for levelup
    });

    it("getTokens", async () => {
      const userAddress = users[0].address;
      await expect(
        schneeball["getTokens(uint256,uint256)"](0, 0)
      ).to.revertedWith("Amount > 0");
      let query: QueryStructOutput[] = await schneeball[
        "getTokens(uint256,uint256)"
      ](0, 1);
      expect(query.length).to.equal(1);
      expect(query[0].player).to.equal(userAddress);
      expect(query[0].tokenId).to.equal(1);
      expect(query[0].level).to.equal(1);

      query = await schneeball["getTokens(uint256,uint256)"](0, 1);
      expect(query.length).to.equal(1);
      expect(query[0].player).to.equal(userAddress);
      expect(query[0].tokenId).to.equal(1);
      expect(query[0].level).to.equal(1);

      query = await schneeball["getTokens(uint256,uint256)"](0, 2);
      expect(query.length).to.equal(2);
      expect(query[0].player).to.equal(userAddress);
      expect(query[0].tokenId).to.equal(1);
      expect(query[0].level).to.equal(1);
      expect(query[1].player).to.equal(userAddress);
      expect(query[1].tokenId).to.equal(2);
      expect(query[1].level).to.equal(1);

      query = await schneeball["getTokens(uint256,uint256)"](0, 5);
      expect(query.length).to.equal(3);

      query = await schneeball["getTokens(uint256,uint256)"](0, 1);
      expect(query.length).to.equal(1);

      query = await schneeball["getTokens(uint256,uint256)"](1, 1);
      expect(query.length).to.equal(1);
      expect(query[0].player).to.equal(userAddress);
      expect(query[0].tokenId).to.equal(2);
      expect(query[0].level).to.equal(1);

      query = await schneeball["getTokens(uint256,uint256)"](2, 1);
      expect(query.length).to.equal(1);
      expect(query[0].player).to.equal(users[1].address);
      expect(query[0].tokenId).to.equal(3);
      expect(query[0].level).to.equal(1);
    });
  });

  describe("Simple mint and toss flow", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        5,
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
        "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
        REGISTRY_ADDRESS_TESTNET,
        60,
        15
      );
      await schneeball.deployed();
    });
    it("erc721 round methods revert before first round", async () => {
      await expect(schneeball["ownerOf(uint256)"](1)).to.revertedWith(
        "No Round started"
      );
      await expect(
        schneeball["ownerOf(uint256,uint256)"](1, 1)
      ).to.revertedWith("No Round started");
      await expect(
        schneeball["balanceOf(address)"](users[0].address)
      ).to.revertedWith("No Round started");
      await expect(
        schneeball["balanceOf(uint256,address)"](2, users[0].address)
      ).to.revertedWith("No Round started");
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

      await expect(
        schneeball.mint(constants.AddressZero, { value: MINT_FEE })
      ).to.revertedWith("ERC721: mint to the zero address");
    });
    it("ownerOf is correct", async () => {
      const ownerOf1 = await schneeball["ownerOf(uint256)"](1);
      const ownerOf2 = await schneeball["ownerOf(uint256,uint256)"](1, 1);

      expect(ownerOf1).to.equal(users[0].address);
      expect(ownerOf2).to.equal(users[0].address);

      await expect(schneeball["ownerOf(uint256)"](3)).to.revertedWith(
        "Invalid token"
      );
      await expect(
        schneeball["ownerOf(uint256,uint256)"](1, 3)
      ).to.revertedWith("Invalid token");
      await expect(
        schneeball["ownerOf(uint256,uint256)"](2, 1)
      ).to.revertedWith("No Round started");
    });
    it("balanceOf is correct", async () => {
      const balanceOf1 = await schneeball["balanceOf(address)"](
        users[0].address
      );
      const balanceOf2 = await schneeball["balanceOf(uint256,address)"](
        1,
        users[0].address
      );

      expect(balanceOf1).to.equal(2);
      expect(balanceOf2).to.equal(2);

      await expect(
        schneeball["balanceOf(address)"](constants.AddressZero)
      ).to.revertedWith("Zero address");
      await expect(
        schneeball["balanceOf(uint256,address)"](1, constants.AddressZero)
      ).to.revertedWith("Zero address");
      await expect(
        schneeball["balanceOf(uint256,address)"](2, users[0].address)
      ).to.revertedWith("No Round started");
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
      let cooldown = await schneeball.isOnCooldown(userAddress);
      expect(cooldown).to.equal(false);
      let timeout = await schneeball.isTimedOut(userAddress);
      expect(timeout).to.equal(false);
      let tossTx = await schneeball.connect(users[0]).toss(partnerAddress, 1, {
        value: TOSS_FEE(1),
      });
      await tossTx.wait();
      let balance = await schneeball["balanceOf(address)"](partnerAddress);
      expect(Number(balance)).to.equal(1);
      balance = await schneeball["balanceOf(address)"](userAddress);
      expect(Number(balance)).to.equal(2);
      cooldown = await schneeball.isOnCooldown(userAddress);
      expect(cooldown).to.equal(true);
      timeout = await schneeball.isTimedOut(userAddress);
      expect(timeout).to.equal(false);

      // mine 90 blocks
      await hardhat.network.provider.send("hardhat_mine", ["0x5A", "0x2"]);
      cooldown = await schneeball.isOnCooldown(userAddress);
      expect(cooldown).to.equal(false);

      tossTx = await schneeball.connect(users[0]).toss(partner2Address, 1, {
        value: TOSS_FEE(1),
      });
      await tossTx.wait();
      balance = await schneeball["balanceOf(address)"](partner2Address);
      expect(Number(balance)).to.greaterThanOrEqual(1);
      cooldown = await schneeball.isOnCooldown(userAddress);
      expect(cooldown).to.equal(true);
    });
    it("cannot toss in cooldown", async () => {
      const partner3Address = users[3].address;
      const tossTx = schneeball.connect(users[0]).toss(partner3Address, 1, {
        value: TOSS_FEE(1),
      });
      await expect(tossTx).to.revertedWith("Cooldown");
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
      expect(tokenURI).to.be.equal(
        `ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf/${tokenLevel}`
      );
      const tokenURIRoundId = await schneeball["tokenURI(uint256,uint256)"](
        1,
        1
      );
      const tokenLevelRoundId = await schneeball["getLevel(uint256,uint256)"](
        1,
        1
      );
      expect(tokenURIRoundId).to.be.equal(
        `ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf/${tokenLevelRoundId}`
      );
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
    it("Contract returns snowball info", async () => {
      const snowball: SnowballStruct = await schneeball["getSnowball(uint256)"](
        1
      );
      expect(snowball.partners.length).to.be.eq(2);
    });
  });
  describe("ERC721", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      const REGISTRY = await ethers.getContractFactory("TestProxyRegistry");
      const registry = await REGISTRY.connect(users[0]).deploy();
      await registry.deployed();

      // Deploy Schneeballschlacht
      const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
      schneeball = await Schneeball.deploy(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        5,
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
        "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
        registry.address,
        60,
        15
      );
      await schneeball.deployed();
    });
    it("erc721 fails before first round", async () => {
      await expect(schneeball["getApproved(uint256)"](1)).to.revertedWith(
        "No Round started"
      );
      await expect(
        schneeball["getApproved(uint256,uint256)"](1, 1)
      ).to.revertedWith("No Round started");

      await expect(
        schneeball.connect(users[1]).setApprovalForAll(users[0].address, true)
      ).to.revertedWith("No Round started");
      await expect(
        schneeball["isApprovedForAll(uint256,address,address)"](
          1,
          users[1].address,
          users[0].address
        )
      ).to.revertedWith("No Round started");
    });
    it("can start successfully", async () => {
      const startTx = await schneeball.startRound();
      await startTx.wait();
    });
    it("tokenUri works", async () => {
      const tokenURI1 = await schneeball["tokenURI(uint256)"](1);
      const tokenURI2 = await schneeball["tokenURI(uint256,uint256)"](1, 1);

      // TODO: deploy folder to ipfs
      expect(tokenURI1).to.equal(
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf/1"
      );
      expect(tokenURI2).to.equal(
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf/1"
      );
    });
    it("can transfer", async () => {
      const transferTx = await schneeball.transferFrom(
        users[0].address,
        users[1].address,
        1
      );
      await transferTx.wait();
      let balance = await schneeball["balanceOf(address)"](users[0].address);
      expect(Number(balance)).to.equal(0);
      balance = await schneeball["balanceOf(address)"](users[1].address);
      expect(Number(balance)).to.equal(1);

      await expect(
        schneeball
          .connect(users[0])
          .transferFrom(users[1].address, users[0].address, 1)
      ).to.revertedWith("Unauthorized");
      await expect(
        schneeball
          .connect(users[1])
          .transferFrom(users[1].address, constants.AddressZero, 1)
      ).to.revertedWith("Zero address");
    });
    it("can safeTransfer", async () => {
      const transferTx = await schneeball
        .connect(users[1])
        ["safeTransferFrom(address,address,uint256)"](
          users[1].address,
          users[0].address,
          1
        );
      await transferTx.wait();
      let balance = await schneeball["balanceOf(address)"](users[1].address);
      expect(Number(balance)).to.equal(0);
      balance = await schneeball["balanceOf(address)"](users[0].address);
      expect(Number(balance)).to.equal(1);

      await expect(
        schneeball
          .connect(users[1])
          ["safeTransferFrom(address,address,uint256)"](
            users[0].address,
            users[2].address,
            1
          )
      ).to.revertedWith("Unauthorized");
    });
    it("can safeTransfer to contract", async () => {
      const NoReceiverTest = await ethers.getContractFactory("NoReceiverTest");
      const noReceiverTest = await NoReceiverTest.deploy();
      await noReceiverTest.deployed();

      const ReceiverTest = await ethers.getContractFactory("Receiver");
      const receiverTest = await ReceiverTest.deploy();
      await receiverTest.deployed();

      const WIReceiverTest = await ethers.getContractFactory(
        "ReceiverWrongImpl"
      );
      const wiReceiverTest = await WIReceiverTest.deploy();
      await wiReceiverTest.deployed();

      await expect(
        schneeball
          .connect(users[0])
          ["safeTransferFrom(address,address,uint256)"](
            users[0].address,
            noReceiverTest.address,
            1
          )
      ).to.revertedWith("ERC721: transfer to non ERC721Receiver implementer");
      await expect(
        schneeball
          .connect(users[0])
          ["safeTransferFrom(address,address,uint256)"](
            users[0].address,
            wiReceiverTest.address,
            1
          )
      ).to.revertedWith("ERC721: transfer to non ERC721Receiver implementer");
    });
    it("can approve", async () => {
      const transferTx = await schneeball
        .connect(users[0])
        .approve(users[1].address, 1);
      await transferTx.wait();
      const approvedAddress1 = await schneeball["getApproved(uint256)"](1);
      expect(approvedAddress1).to.be.equal(users[1].address);
      const approvedAddress2 = await schneeball["getApproved(uint256,uint256)"](
        1,
        1
      );
      expect(approvedAddress2).to.be.equal(users[1].address);

      await expect(
        schneeball.connect(users[0]).approve(users[0].address, 1)
      ).to.revertedWith("ERC721: approval to current owner");
      await expect(
        schneeball.connect(users[1]).approve(users[2].address, 1)
      ).to.revertedWith(
        "ERC721: approve caller is not token owner nor approved for all"
      );
      await expect(
        schneeball["getApproved(uint256,uint256)"](2, 1)
      ).to.revertedWith("No Round started");
      await expect(
        schneeball["getApproved(uint256,uint256)"](1, 2)
      ).to.revertedWith("ERC721: invalid token ID");
      await expect(schneeball["getApproved(uint256)"](2)).to.revertedWith(
        "ERC721: invalid token ID"
      );
    });
    it("can approve for all", async () => {
      let transferTx = await schneeball
        .connect(users[1])
        .setApprovalForAll(users[0].address, true);
      await transferTx.wait();
      let approvedAddress1 = await schneeball[
        "isApprovedForAll(address,address)"
      ](users[1].address, users[0].address);
      expect(approvedAddress1).to.be.true;
      let approvedAddress2 = await schneeball[
        "isApprovedForAll(uint256,address,address)"
      ](1, users[1].address, users[0].address);
      expect(approvedAddress2).to.be.true;

      transferTx = await schneeball
        .connect(users[1])
        .setApprovalForAll(users[0].address, false);
      await transferTx.wait();
      approvedAddress1 = await schneeball["isApprovedForAll(address,address)"](
        users[1].address,
        users[0].address
      );
      expect(approvedAddress1).to.be.false;
      approvedAddress2 = await schneeball[
        "isApprovedForAll(uint256,address,address)"
      ](1, users[1].address, users[0].address);
      expect(approvedAddress2).to.be.false;

      await expect(
        schneeball.connect(users[1]).setApprovalForAll(users[1].address, true)
      ).to.revertedWith("ERC721: approve to caller");
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

  describe("Contract Creation - Always stone", () => {
    let schneeball: Contract;
    let users: SignerWithAddress[];
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy SchneeballSchlachtTimeoutTest
      const SchneeballSchlachtTimeoutTest = await ethers.getContractFactory(
        "SchneeballSchlachtTimeoutTest"
      );
      schneeball = await SchneeballSchlachtTimeoutTest.deploy(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero
      );
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
      const totalSupply1 = await schneeball["totalSupply()"]();
      expect(Number(totalSupply1)).to.equal(2);
      const totalSupply2 = await schneeball["totalSupply(uint256)"](1);
      expect(Number(totalSupply2)).to.equal(2);
      await expect(schneeball["totalSupply(uint256)"](2)).to.revertedWith(
        "Invalid id"
      );
      await expect(schneeball["totalSupply(uint256)"](0)).to.revertedWith(
        "Invalid id"
      );
    });
    it("can toss successfully", async () => {
      const userAddress = users[0].address;
      const partnerAddress = users[1].address;
      const partner2Address = users[2].address;
      let cooldown = await schneeball.isOnCooldown(userAddress);
      expect(cooldown).to.equal(false);
      let timeout = await schneeball.isTimedOut(userAddress);
      expect(timeout).to.equal(false);
      timeout = await schneeball.isTimedOut(partnerAddress);
      expect(timeout).to.equal(false);
      let tossTx = await schneeball.connect(users[0]).toss(partnerAddress, 1, {
        value: TOSS_FEE(1),
      });
      await tossTx.wait();
      let balance = await schneeball["balanceOf(address)"](partnerAddress);
      expect(Number(balance)).to.equal(1);
      balance = await schneeball["balanceOf(address)"](userAddress);
      expect(Number(balance)).to.equal(2);
      cooldown = await schneeball.isOnCooldown(userAddress);
      expect(cooldown).to.equal(true);
      timeout = await schneeball.isTimedOut(userAddress);
      expect(timeout).to.equal(false);
      timeout = await schneeball.isTimedOut(partnerAddress);
      expect(timeout).to.equal(true);

      // mine 90 blocks
      await hardhat.network.provider.send("hardhat_mine", ["0x5A", "0x2"]);
      cooldown = await schneeball.isOnCooldown(userAddress);
      expect(cooldown).to.equal(false);
      timeout = await schneeball.isTimedOut(partner2Address);
      expect(timeout).to.equal(false);

      tossTx = await schneeball.connect(users[0]).toss(partner2Address, 1, {
        value: TOSS_FEE(1),
      });
      await tossTx.wait();
      balance = await schneeball["balanceOf(address)"](partner2Address);
      expect(Number(balance)).to.greaterThanOrEqual(1);
      cooldown = await schneeball.isOnCooldown(userAddress);
      expect(cooldown).to.equal(true);
      timeout = await schneeball.isTimedOut(partner2Address);
      expect(timeout).to.equal(true);
    });
    it("cannot toss in cooldown", async () => {
      const partner3Address = users[3].address;
      const tossTx = schneeball.connect(users[0]).toss(partner3Address, 1, {
        value: TOSS_FEE(1),
      });
      await expect(tossTx).to.revertedWith("Cooldown");
    });
    it("cannot toss on timeout", async () => {
      const partner3Address = users[3].address;
      const tossTx = schneeball.connect(users[2]).toss(partner3Address, 4, {
        value: TOSS_FEE(1),
      });
      await expect(tossTx).to.revertedWith("Timeout");
    });
    it("snowball has stone", async () => {
      const snowball: SnowballStruct = await schneeball["getSnowball(uint256)"](
        1
      );
      expect(snowball.hasStone).to.be.eq(true);
    });
  });
});
