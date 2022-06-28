/* eslint-disable node/no-missing-import */
import { ethers } from "hardhat";
import { MINT_FEE } from "./utils";
import ProgressBar from "progress";

async function main() {
  const signers = await ethers.getSigners();
  const Sbs = await ethers.getContractFactory("Schneeballschlacht");
  const sbs = await Sbs.deploy(ethers.constants.AddressZero);
  await sbs.deployed();
  const startTx = await sbs.startRound();
  await startTx.wait();
  const total = 10000;
  let bar = new ProgressBar(":bar :percent", { total, width: 100 });
  console.log("Dispatching tokens!");
  for (let i = 0; i < total; i++) {
    bar.tick();
    const mintTx = await sbs.connect(signers[0]).mint(signers[0].address, {
      value: MINT_FEE,
    });
    await mintTx.wait();
  }
  const amounts = [100, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500];
  bar = new ProgressBar(":bar :amount", { total: amounts.length, width: 100 });
  for (const amount of amounts) {
    bar.tick({ amount });
    try {
      const gas = await sbs.estimateGas["getTokens(uint256, uint256)"](
        0,
        amount
      );
      console.log(`Gas used: ${gas}`);
    } catch (e) {
      console.log("Expensive!");
      console.log(e);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
