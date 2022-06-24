/* eslint-disable node/no-missing-import */
/* eslint-disable object-shorthand */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { randomInt } from "crypto";
import { BigNumber, Contract } from "ethers";
import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import { Action } from "./types";
import { TRANSFER_FEE, MINT_FEE } from "./utils";

const partners: { [tokenId: number]: string[] } = {};
const addresses: string[] = [];
const history: Action[] = [];

async function hasTokens(contract: Contract, address: string) {
  const balance = await contract["balanceOf(address)"](address);
  return Number(balance) > 0;
}

async function getLevel(contract: Contract, tokenId: number | BigNumber) {
  return Number(await contract.functions["getLevel(uint256)"](tokenId));
}

async function getMaxToken(contract: Contract, address: string) {
  const tokens = await contract["getTokensOfAddress(address)"](address);
  let maxToken = -1;
  let tmpLevel = 0;
  let tmpAmount = -1;
  for (const token of tokens) {
    const level = await getLevel(contract, token);
    const partners = await contract["getPartnerTokenIds(uint256)"](token);
    if (tmpLevel < level && partners.length < level + 1) {
      tmpLevel = level;
      maxToken = token;
    } else if (tmpLevel === level) {
      if (tmpAmount < 0 && partners.length < level + 1) {
        tmpAmount = partners.length;
        maxToken = token;
        tmpLevel = level;
        continue;
      } else if (tmpAmount < partners.length && partners.length < level + 1) {
        maxToken = token;
        tmpAmount = partners.length;
      }
    }
  }

  return { token: maxToken, level: tmpLevel };
}

function getRandomAddress(currentAddress: string, tokenId: number) {
  const randIndex = randomInt(addresses.length);
  let randAddress = addresses[randIndex];
  if (!partners[tokenId]) {
    partners[tokenId] = [];
  }
  while (
    randAddress === currentAddress ||
    partners[tokenId].includes(randAddress)
  ) {
    const randIndex = randomInt(addresses.length);
    randAddress = addresses[randIndex];
  }
  return randAddress;
}

function addPartner(tokenId: number, address: string) {
  if (partners[tokenId]) {
    partners[tokenId].push(address);
  } else {
    partners[tokenId] = [address];
  }
}

async function main() {
  const wallets = await ethers.getSigners();
  for (const wallet of wallets) {
    addresses.push(await wallet.getAddress());
  }
  const Schneeball = await ethers.getContractFactory("SchneeballSchlacht");
  const schneeball = await Schneeball.deploy();
  console.log("Contract deployed!");
  const startTx = await schneeball.startRound();
  await startTx.wait();
  console.log("Round started!");
  while (true) {
    try {
      const randIndex = randomInt(addresses.length);
      const currentAddress = addresses[randIndex];
      const signer = await ethers.getSigner(currentAddress);
      const { token: tokenId, level } = await getMaxToken(
        schneeball,
        currentAddress
      );
      const canThrow = await hasTokens(schneeball, currentAddress);
      if (canThrow && tokenId > 0) {
        const randAddress = getRandomAddress(currentAddress, tokenId);
        addPartner(tokenId, randAddress);
        const transferTx = await schneeball
          .connect(signer)
          .toss(randAddress, tokenId, {
            value: TRANSFER_FEE(level),
          });
        await transferTx.wait();
        console.log(
          `${currentAddress} tossed to ${randAddress} with tokenId ${tokenId} at ${level}`
        );
        history.push({
          timestamp: Date.now(),
          type: "Toss",
          from: currentAddress,
          to: randAddress,
          tokenId: Number(tokenId),
          level: level,
        });
      } else {
        console.log(`${currentAddress} minted...`);
        const mintTx = await schneeball.connect(signer).mint(currentAddress, {
          value: MINT_FEE,
        });
        await mintTx.wait();
        history.push({
          type: "Mint",
          timestamp: Date.now(),
          to: currentAddress,
          from: undefined,
          tokenId: undefined,
          level: 1,
        });
      }
    } catch (e: any) {
      if (e.toString().includes("Finished")) {
        console.log("Clean up!");
        cleanup(schneeball);
        break;
      }
    }
  }

  const total = Number(await schneeball["totalSupply()"]());
  const addressData: { [address: string]: any[] } = {};
  const roundData: any = {};
  const winner = await schneeball["getWinner()"]();
  const payout = await schneeball["getPayout()"]();
  const tosses = await schneeball["totalTosses()"]();
  const totalSupply = await schneeball["totalSupply(uint256)"](1);
  roundData.winner = winner;
  roundData.payout = Number(payout);
  roundData.tosses = Number(tosses);
  roundData.totalSupply = Number(totalSupply);
  writeFileSync("data/round.json", JSON.stringify(roundData, null, 2));
  writeFileSync("data/history.json", JSON.stringify(history, null, 2));

  for (let i = 1; i <= total; i++) {
    const owner = await schneeball["ownerOf(uint256)"](i);
    const level = await getLevel(schneeball, i);
    const entry = { tokenId: i, level: level };
    if (addressData[owner]) {
      addressData[owner].push(entry);
    } else {
      addressData[owner] = [entry];
    }
  }
  writeFileSync("data/tokens.json", JSON.stringify(addressData, null, 2));
}

async function cleanup(contract: Contract) {
  // TODO: Test lock on transer, mint, toss
  const endTx = await contract["endRound()"]();
  await endTx.wait();
  const { token } = await getMaxToken(contract, addresses[0]);
  try {
    const signer = await ethers.getSigner(addresses[0]);
    await contract.connect(signer)["mint(address)"](addresses[0]);
    throw new Error("Mint not unlocked!");
  } catch (e) {
    console.log(e);
    console.log("Mint locked!");
  }
  try {
    const signer = await ethers.getSigner(addresses[0]);
    await contract
      .connect(signer)
      ["toss(address,uint256)"](addresses[0], token);
    throw new Error("toss not unlocked!");
  } catch (e) {
    console.log(e);
    console.log("Toss locked!");
  }
  try {
    const signer = await ethers.getSigner(addresses[0]);
    await contract
      .connect(signer)
      ["transferFrom(address,address,uint256)"](
        addresses[0],
        addresses[1],
        token
      );
    throw new Error("transferFrom not unlocked!");
  } catch (e) {
    console.log(e);
    console.log("TransferFrom locked!");
  }
  try {
    const signer = await ethers.getSigner(addresses[0]);
    await contract
      .connect(signer)
      ["transferFrom(address,address,uint256)"](
        addresses[0],
        addresses[1],
        token
      );
    throw new Error("safeTransferFrom not unlocked!");
  } catch (e) {
    console.log(e);
    console.log("SafeTransferFrom locked!");
  }
  try {
    await contract["endRound()"]();
    throw new Error("endRound not unlocked!");
  } catch (e: any) {
    console.log(e);
    console.log("endRound locked!");
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
