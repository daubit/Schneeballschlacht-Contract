import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { REGISTRY_ADDRESS_TESTNET } from "../scripts/util/const.json";

describe("Schneeballschlacht - HOF", async () => {
  let hof: Contract;
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
        "ipfs://1",
        REGISTRY_ADDRESS_TESTNET
      );
      await hof.deployed();
    });
    it("can start successfully", async () => {
      const contractURI = await hof.contractURI();
      expect(contractURI).to.be.equals("ipfs://");
      await expect(hof.connect(users[1]).mint(users[0].address)).to.reverted;
      const mintTx = await hof.connect(users[0]).mint(users[2].address);
      await mintTx.wait();
      expect(await hof.ownerOf(1)).to.be.equals(users[2].address);
      expect(await hof.tokenURI(1)).to.be.equals("ipfs://1");
    });
  });
});
