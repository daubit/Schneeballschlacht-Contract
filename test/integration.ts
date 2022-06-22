/* eslint-disable node/no-missing-import */
/* eslint-disable object-shorthand */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { randomInt } from "crypto";
import { BigNumber, Contract } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { writeFileSync } from "fs";
import { ethers } from "hardhat";

const TRANSFER_FEE = (level: number) => parseEther((0.001 * level).toFixed(5));
const MINT_FEE = parseEther("0.1");
const partners: { [tokenId: number]: string[] } = {};
const addresses: string[] = [];
interface Event {
  type: "Mint" | "Toss";
  tokenId: number | undefined;
  level: number | undefined;

  to: string;
  timestamp: number;
}
const history: Event[] = [];
async function hasTokens(contract: Contract, address: string) {
  const balance = await contract["balanceOf(address)"](address);
  return Number(balance) > 0;
}

async function getLevel(contract: Contract, tokenId: number | BigNumber) {
  return Number(await contract.functions["getLevel(uint256)"](tokenId));
}

async function getMaxToken(contract: Contract, address: string) {
  const tokens = await contract["getTokensOfAddress(address)"](address);
  let maxToken;
  let tmpLevel = 0;
  for (const token of tokens) {
    const level = await getLevel(contract, token);
    if (tmpLevel < level) {
      tmpLevel = level;
      maxToken = token;
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
      if (await hasTokens(schneeball, currentAddress)) {
        const { token, level } = await getMaxToken(schneeball, currentAddress);
        const maxToken = token!.toNumber();
        const randAddress = getRandomAddress(currentAddress, maxToken);
        addPartner(maxToken, randAddress);
        const transferTx = await schneeball
          .connect(signer)
          .toss(randAddress, maxToken, {
            value: TRANSFER_FEE(level),
          });
        await transferTx.wait();
        console.log(
          `${currentAddress} tossed to ${randAddress} with token ${token} at ${level}`
        );
        history.push({
          timestamp: Date.now(),
          type: "Toss",
          to: randAddress,
          tokenId: token,
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
          tokenId: undefined,
          level: 1,
        });
      }
    } catch (e: any) {
      console.log({ e });
      if (e.reason && e.reason.includes("Round has finished")) {
        cleanup();
      }
      break;
    }
  }

  const total = Number(await schneeball["totalSupply()"]());
  const addressData: { [address: string]: any[] } = {};
  const roundData: any = {};
  const winner = await schneeball["getWinner()"]();
  const payout = await schneeball["getPayout()"]();
  const tosses = await schneeball["totalTosses()"]();
  roundData.winner = winner;
  roundData.payout = Number(payout);
  roundData.tosses = Number(tosses);
  writeFileSync("data/round.json", JSON.stringify(roundData, null, 2));
  writeFileSync("data/history.json", JSON.stringify(history, null, 2));

  for (let i = 1; i <= total; i++) {
    const owner = (await schneeball["ownerOf(uint256)"](i))[0];
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

function cleanup() {
  // TODO: Test lock on transer, mint, toss
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
