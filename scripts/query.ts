/* eslint-disable node/no-missing-import */
import { ethers } from "hardhat";
import ProgressBar from "progress";

async function main() {
  const signers = await ethers.getSigners();
  const Sbs = await ethers.getContractFactory("Schneeballschlacht");
  const sbs = await Sbs.deploy(ethers.constants.AddressZero);
  await sbs.deployed();
  const startTx = await sbs.startRound();
  await startTx.wait();
  const total = 100;
  let bar = new ProgressBar(":bar :percent", {
    total,
    width: 100,
  });
  console.log("Minting...");
  for (let i = 0; i < 100; i++) {
    bar.tick();
    const mintTx = await sbs
      .connect(signers[0])
      ["mint(address,uint256)"](signers[0].address, total);
    await mintTx.wait();
  }
  console.log("Querying...");
  const amounts = [100, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500];
  bar = new ProgressBar(":bar :percent :token1", {
    total: amounts.length,
    width: 100,
  });
  for (const amount of amounts) {
    bar.tick({ token1: amount });
    try {
      const gas = await sbs.estimateGas["getTokens(uint256,uint256)"](
        0,
        amount
      );
      console.log(`Gas used: ${gas}`);
    } catch (e) {
      console.log("Expensive!");
      console.log(e);
      break;
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
