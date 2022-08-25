/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hardhat, { ethers } from "hardhat";
import { Storage } from "./storage";
import { REGISTRY_ADDRESS_TESTNET } from "./util/const.json";
import { verify } from "./utils";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const NETWORK_NAME: { [chainId: number]: string } = {
  80001: "mumbai",
  137: "polygon",
  1337: "development",
};

const networkName = (chainId: number) =>
  NETWORK_NAME[chainId]
    ? NETWORK_NAME[chainId]
    : new Error("Cannot find chain name");

async function main() {
  const network = await ethers.provider.getNetwork();
  const { provider } = ethers;
  const chainId = (await provider.getNetwork()).chainId;
  const storage = new Storage("addresses.json");
  let {
    sbs: sbsAddress,
    hof: hofAddress,
    escrow: escrowAddress,
  } = storage.fetch(network.chainId);
  const addresses: any = {};
  // We get the contract to deploy
  if (!hofAddress) {
    const HOF = await ethers.getContractFactory("HallOfFame");
    const hof = await HOF.deploy(
      "ipfs://QmeGxiig9wkTHCzivD6XyXJNeGsGvVBTNRyAgEL9YxzzAP",
      "ipfs://QmTy3CmV7batLCuh3t5CGRjSsDk9iJ1LgYSDi8hdCyQ7w2",
      REGISTRY_ADDRESS_TESTNET
    );
    await hof.deployed();
    addresses.hof = hof.address;
    hofAddress = hof.address;
    console.log("Hall of Fame deployed to:", hof.address);

    console.log("Waiting for verification...");
    await sleep(60 * 1000);
    await verify(hardhat, hof.address, chainId, [
      "ipfs://QmeGxiig9wkTHCzivD6XyXJNeGsGvVBTNRyAgEL9YxzzAP",
      "ipfs://QmTy3CmV7batLCuh3t5CGRjSsDk9iJ1LgYSDi8hdCyQ7w2",
      REGISTRY_ADDRESS_TESTNET,
    ]);
  }
  if (!escrowAddress) {
    const EscrowManager = await ethers.getContractFactory("EscrowManager");
    const em = await EscrowManager.deploy();
    await em.deployed();
    addresses.escrow = em.address;
    escrowAddress = em.address;
    console.log("Escrow Manager deployed to:", em.address);

    console.log("Waiting for verification...");
    await sleep(60 * 1000);
    await verify(hardhat, em.address, chainId, []);
  }
  if (!sbsAddress) {
    const Sbs = await ethers.getContractFactory("Schneeballschlacht");
    const sbs = await Sbs.deploy(
      hofAddress,
      escrowAddress,
      3,
      "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
      "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
      REGISTRY_ADDRESS_TESTNET,
      2,
      1
    );
    await sbs.deployed();

    console.log("Schneeballschlacht deployed to:", sbs.address);
    console.log("Waiting for verification...");
    await sleep(60 * 1000);
    await verify(hardhat, sbs.address, chainId, [
      hofAddress,
      escrowAddress,
      "3",
      "ipfs://Qmb9rdB5Fb5GsHP495NkYSgJHArWuhKwapB6WdbwYfBCaf",
      "ipfs://QmeD8EqWfoKg3GBjQrVPLxPMChADdq7r9D6L8T3y5vdkqT",
      REGISTRY_ADDRESS_TESTNET,
      "2",
      "1",
    ]);

    addresses.sbs = sbs.address;
    console.log("Schneeballschlacht deployed to:", sbs.address);

    const HOF = await ethers.getContractFactory("HallOfFame");
    const hof = HOF.attach(hofAddress ?? addresses.hof);
    let grantRoleTx = await hof.grantRole(
      "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
      addresses.sbs
    );
    await grantRoleTx.wait();

    const EM = await ethers.getContractFactory("EscrowManager");
    const em = EM.attach(escrowAddress ?? addresses.escrow);
    grantRoleTx = await em.grantRole(em.ESCROW_ROLE(), addresses.sbs);
    await grantRoleTx.wait();
  }
  storage.save(network.chainId, addresses);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
