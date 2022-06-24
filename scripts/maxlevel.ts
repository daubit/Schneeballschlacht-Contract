/* eslint-disable node/no-missing-import */
import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import { TOSS_FEE } from "./utils";

const gasUsedPerLevel: { [level: number]: any[] } = {};
const errors: any = [];

async function main() {
  const wallets = await ethers.getSigners();
  const addresses = [];
  for (const wallet of wallets) {
    addresses.push(await wallet.getAddress());
  }
  const iterator = (start: number) => {
    let value = start;
    return () => ++value % addresses.length;
  };

  let currentAddress = addresses[0];
  let currentToken = 1;
  console.log(`Amount of wallets: ${wallets.length}`);
  const Schneeball = await ethers.getContractFactory("Schneeballschlacht");
  const schneeball = await Schneeball.deploy();
  const startTx = await schneeball.startRound();
  await startTx.wait();

  console.log("Contract deployed!");
  for (let level = 1; level < 20; level++) {
    const next = iterator(addresses.indexOf(currentAddress));
    // Transfering Token
    for (let i = 0; i <= level; i++) {
      const nextIndex = next();
      try {
        const transferTx = await schneeball
          .connect(await ethers.getSigner(currentAddress))
          .toss(addresses[nextIndex], currentToken, {
            value: TOSS_FEE(
              (
                await schneeball.functions["getLevel(uint256)"](currentToken)
              )[0]
            ),
          });
        await transferTx.wait();
        if (gasUsedPerLevel[level]) {
          gasUsedPerLevel[level].push(transferTx);
        } else {
          gasUsedPerLevel[level] = [transferTx];
        }
      } catch (e) {
        console.log("Oh no, an error occurred!");
        errors.push(e);
      }
    }
    const total = Number(await schneeball.functions["totalSupply()"]());
    // Lookup upgraded Token
    for (let i = currentToken; i <= total; i++) {
      const nextLevel = Number(
        await schneeball.functions["getLevel(uint256)"](i)
      );
      if (level + 1 === nextLevel) {
        currentToken = i;
        currentAddress = (
          await schneeball.functions["ownerOf(uint256)"](currentToken)
        )[0];
        console.log(
          `TokenId ${currentToken} of ${currentAddress} has upgraded to ${nextLevel}!`
        );
        break;
      }
    }
  }
  writeFileSync("data/log.json", JSON.stringify(gasUsedPerLevel, null, 2));
  writeFileSync("data/error.json", JSON.stringify(errors, null, 2));

  const total = Number(await schneeball.functions["totalSupply()"]());
  const addressData: { [address: string]: any[] } = {};
  for (let i = 1; i <= total; i++) {
    const owner = (await schneeball.functions["ownerOf(uint256)"](i))[0];
    const level = Number(await schneeball.functions["getLevel(uint256)"](i));
    const entry = { tokenId: i, level: level };
    if (addressData[owner]) {
      addressData[owner].push(entry);
    } else {
      addressData[owner] = [entry];
    }
  }
  writeFileSync("data/tokens.json", JSON.stringify(addressData, null, 2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
