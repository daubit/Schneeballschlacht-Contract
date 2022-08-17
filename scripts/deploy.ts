/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hardhat, { ethers } from "hardhat";
import { Storage } from "./storage";

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
  let { sbs: sbsAddress, hof: hofAddress } = storage.fetch(network.chainId);
  const addresses: any = {};
  // We get the contract to deploy
  if (!hofAddress) {
    const HOF = await ethers.getContractFactory("HallOfFame");
    const hof = await HOF.deploy(
      "QmeGxiig9wkTHCzivD6XyXJNeGsGvVBTNRyAgEL9YxzzAP",
      "QmTRZbTVWJHtJ8JMYyh8jhKy8hH2CGgVDWTfobcnVdq8Cs"
    );
    await hof.deployed();
    addresses.hof = hof.address;
    hofAddress = hof.address;
    console.log("Hall of Fame deployed to:", hof.address);

    console.log("Waiting for verification...");
    await sleep(60 * 1000);
    hardhat.run("verify", {
      address: hof.address,
      network: networkName(chainId),
      constructorArgsParams: [
        "ipfs://QmeGxiig9wkTHCzivD6XyXJNeGsGvVBTNRyAgEL9YxzzAP",
        "ipfs://QmTRZbTVWJHtJ8JMYyh8jhKy8hH2CGgVDWTfobcnVdq8Cs",
      ],
    });
  }
  if (!sbsAddress) {
    const Sbs = await ethers.getContractFactory("Schneeballschlacht");
    const sbs = await Sbs.deploy(
      hofAddress,
      3,
      "ipfs://QmdotB3KQb9YuodG4TXLSu4sMtnfy5EpgcfuZC9RPP6yyS",
      15,
      60
    );
    await sbs.deployed();

    console.log("Schneeballschlacht deployed to:", sbs.address);
    console.log("Waiting for verification...");
    await sleep(60 * 1000);
    hardhat.run("verify", {
      address: sbs.address,
      network: networkName(chainId),
      constructorArgsParams: [
        hofAddress,
        "3",
        "ipfs://QmdotB3KQb9YuodG4TXLSu4sMtnfy5EpgcfuZC9RPP6yyS",
        "15",
        "60",
      ],
    });

    addresses.sbs = sbs.address;
    console.log("Schneeballschlacht deployed to:", sbs.address);
  }
  storage.save(network.chainId, addresses);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
