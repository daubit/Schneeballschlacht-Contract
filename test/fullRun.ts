/* eslint-disable node/no-missing-import */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat";
import { TOSS_FEE } from "../scripts/utils";
import { REGISTRY_ADDRESS_ADDRESS } from "../scripts/util/const.json";

async function mineBlocks() {
  return network.provider.send("hardhat_mine", ["0xA8C0", "0x2"]);
}

describe("Schneeballschlacht - Full Run with Maxlevel 3", async () => {
  let hof: Contract;
  let schneeball: Contract;
  // eslint-disable-next-line no-unused-vars
  let users: SignerWithAddress[];

  describe("Setup + Functions", () => {
    before(async () => {
      // Setting up accounts
      users = await ethers.getSigners();

      // Deploy Schneeballschlacht
      const HOF = await ethers.getContractFactory("HallOfFame");
      hof = await HOF.connect(users[0]).deploy(
        "ipfs://",
        "ipfs://",
        REGISTRY_ADDRESS_ADDRESS
      );
      await hof.deployed();

      const SchneeballSchlacht = await ethers.getContractFactory(
        "Schneeballschlacht"
      );
      schneeball = await SchneeballSchlacht.connect(users[0]).deploy(
        hof.address,
        3,
        "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
        "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
        REGISTRY_ADDRESS_ADDRESS,
        60,
        15
      );
      await schneeball.deployed();
    });
    it("give schneeballschlacht minter role on hof", async () => {
      const grantTx = await hof
        .connect(users[0])
        .grantRole(
          "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
          schneeball.address
        );
      await grantTx.wait();
      // eslint-disable-next-line no-unused-expressions
      expect(
        await hof.hasRole(
          "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
          schneeball.address
        )
      ).to.be.true;
    });
    it("can start successfully", async () => {
      const startTx = await schneeball.connect(users[0]).startRound();
      await startTx.wait();
      const endHeight = await schneeball["getEndHeight()"]();
      const currentHeight = await ethers.provider.getBlockNumber();
      expect(Number(endHeight)).to.be.be.greaterThan(Number(currentHeight));
    });
    it("can toss to max level", async () => {
      let tossTx = await schneeball
        .connect(users[0])
        .toss(users[1].address, 1, {
          value: TOSS_FEE(1),
        });
      await tossTx.wait();

      await mineBlocks();

      tossTx = await schneeball.connect(users[0]).toss(users[2].address, 1, {
        value: TOSS_FEE(1),
      });
      await tossTx.wait();

      // check parentid in snowball struct?
      const tokenL2Owner = await schneeball["ownerOf(uint256)"](4);
      expect(users.some((x) => x.address === tokenL2Owner)).to.equal(true);
      expect(await schneeball["getLevel(uint256)"](4)).to.equal(2);
      const userIndex = users.findIndex((x) => x.address === tokenL2Owner);
      const L2User = users[userIndex];

      await expect(schneeball.connect(users[0]).endRound()).to.revertedWith(
        "Finished"
      );

      await mineBlocks();

      tossTx = await schneeball.connect(L2User).toss(users[3].address, 4, {
        value: TOSS_FEE(2),
      });
      await tossTx.wait();

      await mineBlocks();

      tossTx = await schneeball.connect(L2User).toss(users[4].address, 4, {
        value: TOSS_FEE(2),
      });
      await tossTx.wait();

      await mineBlocks();

      tossTx = await schneeball.connect(L2User).toss(users[5].address, 4, {
        value: TOSS_FEE(2),
      });
      await tossTx.wait();

      const tokenL3Owner = await schneeball["ownerOf(uint256)"](8);
      expect(users.some((x) => x.address === tokenL2Owner)).to.equal(true);
      expect(await schneeball["getLevel(uint256)"](8)).to.equal(3);
      const user3Index = users.findIndex((x) => x.address === tokenL3Owner);
      const L3User = users[user3Index];

      // can end round

      const endroundTx = await schneeball.connect(users[0]).endRound();
      await endroundTx.wait();
    });
  });
});
