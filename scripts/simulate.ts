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
import { mkdirSync, writeFileSync } from "fs";
import { ethers } from "hardhat";

const TRANSFER_FEE = (level: number) => parseEther((0.001 * level).toFixed(5));
const MINT_FEE = parseEther("0.1");
const partners: { [tokenId: number]: string[] } = {};
const addresses: string[] = [];
interface Event {
  type: "Mint" | "Toss";
  tokenId: number | undefined;
  level: number | undefined;
  from: string | undefined;
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

async function getToken(contract: Contract, address: string) {
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

function newPartner(address: string, tokenId: number) {
  const randAddress = getRandomAddress(address, tokenId);
  addPartner(tokenId, randAddress);
  return randAddress;
}

async function getRandomSigner() {
  const randIndex = randomInt(addresses.length);
  const currentAddress = addresses[randIndex];
  const signer = await ethers.getSigner(currentAddress);
  return signer;
}

async function simulate(id: number, n: number) {
  const Schneeball = await ethers.getContractFactory("SchneeballSchlacht");
  const schneeball = await Schneeball.deploy();
  console.log("Contract deployed!");
  for (let round = 1; round < n; round++) {
    console.log(`Round ${round} started!`);
    const startTx = await schneeball.startRound();
    await startTx.wait();
    while (true) {
      try {
        const signer = await getRandomSigner();
        const currentAddress = signer.address;
        const { token: tokenId, level } = await getToken(
          schneeball,
          currentAddress
        );
        const canThrow = await hasTokens(schneeball, currentAddress);
        if (canThrow && tokenId > 0) {
          const randAddress = newPartner(currentAddress, tokenId);
          const transferTx = await schneeball
            .connect(signer)
            .toss(randAddress, tokenId, {
              value: TRANSFER_FEE(level),
            });
          await transferTx.wait();
          console.log(
            `Game ${id}:\t${currentAddress} tossed to ${randAddress} with tokenId ${tokenId} at ${level}`
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
          console.log(`Game ${id}:\t${currentAddress} minted...`);
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
        if (e.toString().includes("Round has finished")) {
          console.log(`Game ${id} has finished`);
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
          writeFileSync(
            `data/${id}/round.json`,
            JSON.stringify(roundData, null, 2)
          );
          writeFileSync(
            `data/${id}/history.json`,
            JSON.stringify(history, null, 2)
          );

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
          writeFileSync(
            `data/${id}/tokens.json`,
            JSON.stringify(addressData, null, 2)
          );
          break;
        }
      }
    }
  }
}

async function main() {
  const wallets = await ethers.getSigners();
  for (const wallet of wallets) {
    addresses.push(await wallet.getAddress());
  }
  for (let id = 1; id < 5; id++) {
    mkdirSync(`data/${id}`);
    await simulate(id, 2);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
