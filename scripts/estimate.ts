/* eslint-disable node/no-unsupported-features/es-builtins */
/* eslint-disable node/no-missing-import */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { parseEther } from "ethers/lib/utils";
import { writeFileSync } from "fs";
import { ethers } from "hardhat";

const MINT_FEE = parseEther("0.1");
const TRANSFER_FEE = (level: number) => parseEther((0.001 * level).toString());
const gasUsedPerLevel: { [level: number]: any[] } = {};

// TODO:
//	Catch error
// 	View Balance of Contract
//	Question owned token upgrade
// 	Block user
// 	transfers => throws. TokenIds used in Game can be transfered
//	Investigate double trans error
// 	Investigate insufficient fee error when at level 9
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
  const Ponzi = await ethers.getContractFactory("PonziDAO");
  const ponzi = await Ponzi.deploy();
  await ponzi.mint(currentAddress, {
    value: MINT_FEE,
  });
  for (let level = 1; level <= 11; level++) {
    console.log(
      `At Level ${level}\nAddress ${currentAddress} is transfering TokenId ${currentToken}`
    );
    const next = iterator(addresses.indexOf(currentAddress) + 1);
    // Transfering Token
    for (let i = 0; i <= level + 1; i++) {
      const nextIndex = next();
      try {
        const transferTx = await ponzi
          .connect(await ethers.getSigner(currentAddress))
          .transferFrom(currentAddress, addresses[nextIndex], currentToken, {
            value: TRANSFER_FEE(await ponzi.getLevel(currentToken)),
          });
        await transferTx.wait();
        if (gasUsedPerLevel[level]) {
          gasUsedPerLevel[level].push(transferTx);
        } else {
          gasUsedPerLevel[level] = [transferTx];
        }
      } catch (e) {
        console.log({ e });
      }
    }
    const total = await ponzi.totalSupply();
    // Lookup upgraded Token
    for (let i = currentToken; i <= total.toNumber(); i++) {
      const nextLevel = await ponzi.getLevel(i);
      if (level + 1 === nextLevel) {
        currentToken = i;
        currentAddress = await ponzi.ownerOf(currentToken);
        console.log(
          `TokenId ${currentToken} of ${currentAddress} has upgraded to ${nextLevel}!`
        );
        break;
      }
    }
  }
  writeFileSync("log.json", JSON.stringify(gasUsedPerLevel, null, 2));
  const total = (await ponzi.totalSupply()).toNumber();
  const addressData: { [address: string]: any[] } = {};
  for (let i = 1; i <= total; i++) {
    const owner = await ponzi.ownerOf(i);
    const level = await ponzi.getLevel(i);
    const entry = { tokenId: i, level: level };
    if (addressData[owner]) {
      addressData[owner].push(entry);
    } else {
      addressData[owner] = [entry];
    }
  }
  writeFileSync("tokens.json", JSON.stringify(addressData, null, 2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
