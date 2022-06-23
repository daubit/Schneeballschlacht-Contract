/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { Storage } from "./storage";

async function main() {
  const network = await ethers.provider.getNetwork();
  const storage = new Storage("addresses.json");
  let { sbs: sbsAddress, hof: hofAddress } = storage.fetch(network.chainId);
  const addresses: any = {};
  // We get the contract to deploy
  if (!hofAddress) {
    const HOF = await ethers.getContractFactory("HallOfFame");
    const hof = await HOF.deploy();
    await hof.deployed();
    addresses.hof = hof.address;
    hofAddress = hof.address;
    console.log("Hall of Fame deployed to:", hof.address);
  }
  if (!sbsAddress) {
    const Sbs = await ethers.getContractFactory("SchneeballSchlacht");
    const sbs = await Sbs.deploy(hofAddress);
    await sbs.deployed();
    addresses.sbs = sbs.address;
    console.log("SchneeballSchlacht deployed to:", sbs.address);
  }
  storage.save(network.chainId, addresses);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
